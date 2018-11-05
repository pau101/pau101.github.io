(function() {
    class Vector {
        constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        get length() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }

        dot(other) {
            return this.x * other.x + this.y * other.y + this.z * other.z;
        }

        normalize() {
            if (this.length) {
                return this.times(1 / this.length);
            }
            return new Vector(0, 0, 0);
        }

        crossProduct(other) {
            return new Vector(
                this.y * other.z - this.z * other.y,
                this.z * other.x - this.x * other.z,
                this.x * other.y - this.y * other.x
            );
        }

        angle(other) {
            if (this.length && other.length) {
                return Math.acos(this.dot(other) / (this.length * other.length));
            }
            return 0;
        }

        plus(other) {
            return new Vector(
                this.x + other.x,
                this.y + other.y,
                this.z + other.z
            );
        }

        minus(other) {
            return new Vector(
                this.x - other.x,
                this.y - other.y,
                this.z - other.z
            );
        }

        times(other) {
            if (other instanceof Vector) {
                return new Vector(
                    this.x * other.x,
                    this.y * other.y,
                    this.z * other.z
                );
            }
            return new Vector(
                this.x * other,
                this.y * other,
                this.z * other
            );
        }
    }
    class Face {
        constructor(A, B, C) {
            this.A = A;
            this.B = B;
            this.C = C;
        }
    }
    class Edge {
        constructor(A, B) {
            this.A = A;
            this.B = B;
        }
    }
    class Plane {
        constructor(position, normal) {
            this.position = position;
            this.normal = normal;
        }
    }
    class Angle {
        constructor(value) {
            this.value = value;
        }

        static radians(value) {
            return new Angle(value);
        }

        static degrees(value) {
            return new Angle(value * (Math.PI / 180));
        }
    }
    class Network {
        constructor() {
            this.nodes = [];
            this.faces = [];
        }

        addPoint(position) {
            const node = new PointNode(this.nodes.length, position);
            this.nodes.push(node);
            return node;
        }

        addLine(source, direction) {
            const node = new LineNode(this.nodes.length, source, direction);
            this.nodes.push(node);
            return node;
        }

        addTri(A, B, alpha, beta, plane, side) {
            const node = new TriNode(this.nodes.length, A, B, alpha, beta, plane, side);
            this.nodes.push(node);
            return node;
        }

        face(f) {
            this.faces.push(f);
        }
    }
    class Node {
        constructor(index) {
            this.index = index;
        }

        get vertex() {
            throw 'Not implemented';
        }
    }
    class PointNode extends Node {
        constructor(index, position) {
            super(index);
            this.position = position;
        }

        get vertex() {
            return this.position;
        }
    }
    class LineNode extends Node {
        constructor(index, source, direction) {
            super(index);
            this.source = source;
            this.direction = direction;
        }

        get vertex() {
            return this.source.vertex.plus(this.direction);
        }
    }
    class TriNode extends Node {
        constructor(index, A, B, alpha, beta, plane, side) {
            super(index);
            this.A = A;
            this.B = B;
            this.alpha = alpha;
            this.beta = beta;
            this.plane = plane;
            this.side = side;
        }

        get vertex() {
            let gamma = Math.PI - this.alpha.value - this.beta.value;
            let A = this.A.vertex;
            let B = this.B.vertex;
            let AB = B.minus(A);
            let c = AB.length;
            let b = Math.sin(this.beta.value) * c / Math.sin(gamma);
            let v = AB.normalize();
            let k = this.plane.normal.times(this.side);
            let theta = this.alpha.value;
            return v.times(Math.cos(theta))
                .plus(k.crossProduct(v).times(Math.sin(theta)))
                .plus(k.times(k.dot(v) * (1 - Math.cos(theta))))
                .normalize()
                .times(b)
                .plus(A);
        }
    }
    const net = new Network();
    const A = net.addPoint(new Vector(0, 0, 0));
    const B = net.addLine(A, new Vector(1, 0, 0));
    const floor = new Plane(new Vector(0, 0, 0), new Vector(0, 1, 0).normalize());
    const betaAngle = Angle.degrees(60);
    const C = net.addTri(A, B, Angle.degrees(60), betaAngle, floor, 1);
    const wall = new Plane(new Vector(0, 0, 0), C.vertex.minus(A.vertex).crossProduct(new Vector(0, 1, 0)).normalize());
    const D = net.addTri(A, C, Angle.degrees(90), Angle.degrees(20), wall, 1);
    net.face(new Face(A, B, C));
    net.face(new Face(A, C, D));

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 100);
    camera.position.set(1, 1.25, 1);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("white");

    scene.add(new THREE.GridHelper(4, 16, "silver", "lightgray"));

    const geom = new THREE.Geometry();
    for (const node of net.nodes) {
        const vertex = node.vertex;
        geom.vertices.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z));
    }
    for (const f of net.faces) {
        geom.faces.push(new THREE.Face3(f.A.index, f.B.index, f.C.index));
    }
    geom.computeFaceNormals();

    const object = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
        color: "black",
        wireframe: true,
        depthTest: false
    }));
    scene.add(object);

    const arcMat = new THREE.MeshBasicMaterial({ color: "red", transparent: true, opacity: 0.5, depthTest: false, side: THREE.DoubleSide });
    for (const node of [ C, D ]) {
        // TODO: support side
        // TODO: support planes
        {
            const arc = new THREE.CircleGeometry(0.1, 4, (Math.PI - node.beta.value), node.beta.value);
            const b = node.B.vertex;
            const mesh = new THREE.Mesh(arc, arcMat);
            mesh.position.x = b.x;
            mesh.position.y = b.y;
            mesh.position.z = b.z;

            // rotate to XZ plane
            mesh.rotateX(-Math.PI / 2);
            const BA = node.A.vertex.minus(node.B.vertex);
            const rot = new THREE.Quaternion();
            rot.setFromAxisAngle(new Vector(0, 1, 0), (Math.PI - BA.angle(new Vector(1, 0, 0))));
            mesh.applyQuaternion(rot);

            scene.add(mesh);
        }
        {
            const arc = new THREE.CircleGeometry(0.1, 4, 0, node.alpha.value);
            const a = node.A.vertex;
            const mesh = new THREE.Mesh(arc, arcMat);
            mesh.position.x = a.x;
            mesh.position.y = a.y;
            mesh.position.z = a.z;

            // rotate to XZ plane
            mesh.rotateX(-Math.PI / 2);
            const AB = node.B.vertex.minus(node.A.vertex);
            const rot = new THREE.Quaternion();
            rot.setFromAxisAngle(new Vector(0, 1, 0), AB.angle(new Vector(1, 0, 0)));
            mesh.applyQuaternion(rot);

            scene.add(mesh);
        }
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    let time = 0;
    (function render() {
        requestAnimationFrame(render);
        renderer.render(scene, camera);
        //betaAngle.value = Math.PI / 4 + Math.sin(time++ * 0.05) * Math.PI / 10;
       /* function set(vector3, v) {
            vector3.set(v.x, v.y, v.z);
        }
        for (let node of net.nodes) {
            set(geom.vertices[node.index], node.vertex);
        }
        geom.verticesNeedUpdate = true;*/
    })();
    const alphaElem = document.getElementById("alpha");
    const betaElem = document.getElementById("beta");
    const gammaElem = document.getElementById("gamma");
    /*window.addEventListener("deviceorientation", e => {
        alphaElem.innerHTML = (e.alpha || 0).toFixed(2);
        betaElem.innerHTML = (e.beta || 0).toFixed(2);
        gammaElem.innerHTML = (e.gamma || 0).toFixed(2);
        const x = THREE.Math.degToRad(e.beta);
        const y = THREE.Math.degToRad(e.gamma);
        const z = THREE.Math.degToRad(e.alpha);
        camera.rotation.set(x, y, z, "ZXY");
        camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new Vector(-1, 0, 0), Math.PI / 2));
    }, true);*/
    /*const video = document.getElementById("video_feed");
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => video.srcObject = stream);*/
})();
