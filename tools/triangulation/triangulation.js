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

        add(n) {
            this.nodes.push(n);
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
    class FixedNode extends Node {
        constructor(index, position) {
            super(index);
            this.position = position;
        }

        get vertex() {
            return this.position;
        }
    }
    class RayNode extends Node {
        constructor(index, source, direction) {
            super(index);
            this.source = source;
            this.direction = direction;
        }

        get vertex() {
            return this.source.vertex.plus(this.direction);
        }
    }
    class AngleNode extends Node {
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
    let net = new Network();
    let A = new FixedNode(0, new Vector(0, 0, 0));
    let B = new RayNode(1, A, new Vector(1, 0, 0));
    net.add(A);
    net.add(B);
    let floor = new Plane(new Vector(0, 0, 0), new Vector(0, 1, 0).normalize());
    let betaAngle = Angle.degrees(60);
    let C = new AngleNode(2, A, B, Angle.degrees(60), betaAngle, floor, 1);
    net.add(C);
    let D = new AngleNode(3, A, C, Angle.degrees(50), Angle.degrees(20), floor, 1);
    net.add(D);
    net.face(new Face(A, B, C));
    net.face(new Face(A, C, D));

    let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 100);
    camera.position.set(0, 1.5, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    let scene = new THREE.Scene();
    scene.background = new THREE.Color("white");

    scene.add(new THREE.GridHelper(4, 16, "silver", "lightgray"));

    let geom = new THREE.Geometry();
    for (let node of net.nodes) {
        let vertex = node.vertex;
        geom.vertices.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z));
    }
    for (let f of net.faces) {
        geom.faces.push(new THREE.Face3(f.A.index, f.B.index, f.C.index));
    }
    geom.computeFaceNormals();

    let object = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
        color: "black",
        wireframe: true,
        depthTest: false
    }));
    scene.add(object);

    let arcMat = new THREE.MeshBasicMaterial({ color: "red", transparent: true, opacity: 0.5, depthTest: false, side: THREE.DoubleSide });
    for (let node of [ C, D ]) {
        // TODO: support side
        // TODO: support planes
        {
            let arc = new THREE.CircleGeometry(0.1, 4, (Math.PI - node.beta.value), node.beta.value);
            let b = node.B.vertex;
            let mesh = new THREE.Mesh(arc, arcMat);
            mesh.position.x = b.x;
            mesh.position.y = b.y;
            mesh.position.z = b.z;

            // rotate to XZ plane
            mesh.rotateX(-Math.PI / 2);
            let BA = node.A.vertex.minus(node.B.vertex);
            let rot = new THREE.Quaternion();
            rot.setFromAxisAngle(new Vector(0, 1, 0), (Math.PI - BA.angle(new Vector(1, 0, 0))));
            mesh.applyQuaternion(rot);

            scene.add(mesh);
        }
        {
            let arc = new THREE.CircleGeometry(0.1, 4, 0, node.alpha.value);
            let a = node.A.vertex;
            let mesh = new THREE.Mesh(arc, arcMat);
            mesh.position.x = a.x;
            mesh.position.y = a.y;
            mesh.position.z = a.z;

            // rotate to XZ plane
            mesh.rotateX(-Math.PI / 2);
            let AB = node.B.vertex.minus(node.A.vertex);
            let rot = new THREE.Quaternion();
            rot.setFromAxisAngle(new Vector(0, 1, 0), AB.angle(new Vector(1, 0, 0)));
            mesh.applyQuaternion(rot);

            scene.add(mesh);
        }
    }

    let renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    var time = 0;
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
    var alphaElem = document.getElementById("alpha");
    var betaElem = document.getElementById("beta");
    var gammaElem = document.getElementById("gamma");
    window.addEventListener("deviceorientation", e => {
        alphaElem.innerHTML = (e.alpha || 0).toFixed(2);
        betaElem.innerHTML = (e.beta || 0).toFixed(2);
        gammaElem.innerHTML = (e.gamma || 0).toFixed(2);
        let x = THREE.Math.degToRad(e.beta);
        let y = THREE.Math.degToRad(e.gamma);
        let z = THREE.Math.degToRad(e.alpha);
        camera.rotation.set(x, y, z, "ZXY");
        camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new Vector(-1, 0, 0), Math.PI / 2));
    }, true);
})();