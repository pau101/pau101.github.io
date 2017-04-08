Node.prototype.replaceWith = function(replacee) {
    this.parentNode.replaceChild(this, replacee);
};

Array.prototype.remove = function(obj) {
    var idx = this.indexOf(obj);
    if (idx > -1) {
        this.splice(idx, 1);
    }
};

class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    plus(other) {
        if (other instanceof Vec) {
            return new Vec(this.x + other.x, this.y + other.y);
        }
        return new Vec(this.x + other, this.y + other);
    }

    minus(other) {
        if (other instanceof Vec) {
            return new Vec(this.x - other.x, this.y - other.y);
        }
        return new Vec(this.x - other, this.y - other);
    }

    mult(other) {
        if (other instanceof Vec) {
            return new Vec(this.x * other.x, this.y * other.y);
        }
        return new Vec(this.x * other, this.y * other);
    }

    distance(other) {
        return Math.sqrt(this.distanceSq(other));
    }

    distanceSq(other) {
        var dx = this.x - other.x;
        var dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    pitch(other) {
        return Math.atan2(this.x - other.x, this.y - other.y);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        var len = this.length();
        if (len == 0) {
            return new Vec(1, 0);
        }
        return new Vec(this.x / len, this.y / len);
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

class LSD {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.canvas.addEventListener("pointerdown", e => this.mousedown(e));
        this.canvas.addEventListener("pointerup", e => this.mouseup(e));
        this.canvas.addEventListener("pointermove", e => this.mousemove(e));
        this.canvas.addEventListener("mousewheel", e => this.mousewheel(e));
        this.segmentLength = 120;
        this.vertexRadius = 10;
        this.lineWidth = 4;
        this.vertexClickRadiusSq = Math.pow(this.vertexRadius + this.lineWidth, 2);
        var initialVertCount = 5;
        var cx = window.innerWidth / 2;
        var cz = window.innerHeight / 2;
        var radius = window.innerWidth / 4;
        this.vertices = [];
        for (var i = 0; i < initialVertCount; i++) {
            var ang = Math.random() * Math.PI * 2; // i / initialVertCount
            this.vertices.push(new Vec(cx + Math.cos(ang) * radius, cz + Math.sin(ang) * radius));
        }
        this.update(this.vertices[0], this.vertices[0]);
        this.resize();
        window.addEventListener("keydown", e => this.keydown(e));
        window.addEventListener("resize", () => this.resize());
        window.setInterval(() => this.wonder(), 10);
        this.yaw = 0;
        this.yawDelta = 0;
        this.alive = true;
        this.speed = 0;
    }

    resize() {
        this.canvas.width = this.width = window.innerWidth;
        this.canvas.height = this.height = window.innerHeight;
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
        this.ctx.strokeStyle = "black";
        this.ctx.fillStyle = "white";
        this.ctx.lineWidth = this.lineWidth;
        this.draw();
    }

    mousedown(event) {
        delete this.heldPoint;
        delete this.heldLocal;
        var point = new Vec(event.clientX, event.clientY);
        for (var i = 0; i < this.vertices.length; i++) {
            var vert = this.vertices[i];
            if (vert.distanceSq(point) < this.vertexClickRadiusSq) {
                this.heldPoint = vert;
                this.heldLocal = vert.minus(point);
                break;
            }
        }
    }

    mouseup(event) {
        if (this.heldPoint) {
            delete this.heldPoint;
            delete this.heldLocal;
        }
    }

    mousemove(event) {
        if (this.heldPoint) {
            this.update(this.heldPoint, new Vec(event.clientX + this.heldLocal.x, event.clientY + this.heldLocal.y));
        }
    }

    mousewheel(event) {
        if (event.wheelDelta > 0) {
            var len = this.vertices.length;
            var vert2 = this.vertices[len - 1];
            var vert1 = this.vertices[len - 2];
            this.vertices.push(vert2.plus(vert2.minus(vert1).normalize().mult(this.segmentLength)));
            this.draw();
        } else if (this.vertices.length > 2) {
            if (this.vertices.pop() == this.heldPoint) {
                delete this.heldPoint;
                delete this.heldLocal;
            }
            this.draw();
        }
    }

    keydown(event) {
        var key = event.keyCode;
        if (key == 87) { // W
            this.alive = !this.alive;
        }
    }

    wonder() {
        if (!this.alive || this.heldPoint) {
            return;
        }
        var head = this.vertices[0];
        this.yaw += this.yawDelta;
        this.yawDelta *= 0.95;
        if (Math.abs(this.yawDelta) < 0.01) {
            this.yawDelta = Math.random() * 0.1 - 0.05;
        }
        console.log(this.speed);
        if (this.speed < 5) {
            this.speed += 0.2;
            if (this.speed > 5) {
                this.spped = 5;
            }
        }
        var newHead = head.plus(new Vec(Math.cos(this.yaw) * this.speed, Math.sin(this.yaw) * this.speed));
        if (newHead.x < 0 || newHead.y < 0 || newHead.x > this.width || newHead.y > this.height) {
            this.yaw += Math.PI;
            this.speed = 0;
            this.update(head, head);
        } else {
            this.update(head, newHead);
        }
        window.requestAnimationFrame(() => this.draw());
    }

    update(controller, movedController) {
        var cIdx = this.vertices.indexOf(controller);
        var controllerDelta = movedController.minus(controller);
        controller.x = movedController.x;
        controller.y = movedController.y;
        var predecessorDelta = controllerDelta;
        for (var i = cIdx - 1; i >= 0; i--) {
            var vert = this.vertices[i];
            var newVert = this.solve(this.vertices[i + 1], predecessorDelta, vert, i > 0 ? this.vertices[i - 1] : undefined);
            predecessorDelta = newVert.minus(vert);
            this.vertices[i] = newVert;
        }
        predecessorDelta = controllerDelta;
        for (var i = cIdx + 1; i < this.vertices.length; i++) {
            var vert = this.vertices[i];
            var newVert = this.solve(this.vertices[i - 1], predecessorDelta, vert, i < this.vertices.length - 1 ? this.vertices[i + 1] : undefined);
            predecessorDelta = newVert.minus(vert);
            this.vertices[i] = newVert;
        }
        this.draw();
    }

    solve(predecessor, predecessorDelta, current, successor) {
        var solved = undefined;
        if (successor && false) {
            solved = this.solveAnchored(predecessor, current, successor);
        }
        return solved || this.solveFreeFlow(predecessor, predecessorDelta, current);
    }

    solveAnchored(head, tail, anchor) {
        var innerAngle = Math.acos(anchor.distance(head) / (2 * this.segmentLength));
        if (isNaN(innerAngle)) {
            return undefined;
        }
        var side = (anchor.x - head.x) * (tail.y - head.y) - (anchor.y - head.y) * (tail.x - head.x);
        var angle = (side < 0 ? innerAngle : -innerAngle) - anchor.pitch(head) - Math.PI / 2;
        return anchor.plus(new Vec(Math.cos(angle) * this.segmentLength, Math.sin(angle) * this.segmentLength));
    }

    solveFreeFlow(head, headDelta, tail) {
        return head.plus(tail.plus(headDelta.mult(0.25)).minus(head).normalize().mult(this.segmentLength));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawShape();
    }

    drawShape() {
        this.ctx.beginPath();
        this.ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (var i = 1; i < this.vertices.length; i++) {
            var vert = this.vertices[i];
            this.ctx.lineTo(vert.x, vert.y);
        }
        this.ctx.stroke();
        for (var i = this.vertices.length - 1; i >= 0; i--) {
            var vert = this.vertices[i];
            this.ctx.beginPath();
            this.ctx.arc(vert.x, vert.y, this.vertexRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
}

function init() {
    var canvas = document.createElement("canvas");
    new LSD(canvas);
    document.getElementById("canvasPos").replaceWith(canvas);
}
