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

    distanceSq(other) {
        var dx = this.x - other.x;
        var dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
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
        this.canvas.addEventListener("mousedown", e => this.mousedown(e));
        this.canvas.addEventListener("mouseup", e => this.mouseup(e));
        this.canvas.addEventListener("mousemove", e => this.mousemove(e));
        this.canvas.addEventListener("mousewheel", e => this.mousewheel(e));
        this.canvas.addEventListener("touchdown", e => this.touchdown(e));
        this.canvas.addEventListener("touchup", e => this.touchup(e));
        this.canvas.addEventListener("touchmove", e => this.touchmove(e));
        this.segmentLength = 120;
        this.vertexRadius = 10;
        this.lineWidth = 4;
        this.vertexClickRadiusSq = this.vertexRadius * this.vertexRadius + this.lineWidth * this.lineWidth;
        var initialVertCount = 10;
        var cx = window.innerWidth / 2;
        var cz = window.innerHeight / 2;
        var radius = window.innerWidth / 4;
        this.vertices = [];
        for (var i = 0; i < initialVertCount; i++) {
            var ang = i / initialVertCount * Math.PI * 2;
            this.vertices.push(new Vec(cx + Math.cos(ang) * radius, cz + Math.sin(ang) * radius));
        }
        this.update(this.vertices[0]);
        this.resize();
        window.addEventListener("resize", () => this.resize());
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

    touchdown(event) {
        this.touch(event, this.mousedown);
    }

    touchup(event) {
        this.touch(event, this.mouseup);
    }

    touchmove(event) {
        this.touch(event, this.mousemove);
    }

    touch(event, func) {
        if (event.touches.length == 1) {
            var touch = event.touches[0];
            func.apply(this, { button: 0, clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    mousedown(event) {
        if (event.button == 0) {
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
    }

    mouseup(event) {
        if (event.button == 0 && this.heldPoint) {
            delete this.heldPoint;
            delete this.heldLocal;
        }
    }

    mousemove(event) {
        if (this.heldPoint) {
            this.heldPoint.x = event.clientX + this.heldLocal.x;
            this.heldPoint.y = event.clientY + this.heldLocal.y;
            this.update(this.heldPoint);
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
            this.vertices.pop();
            this.draw();
        }
    }

    update(controller) {
        var cIdx = this.vertices.indexOf(controller);
        for (var i = cIdx - 1, predecessor = controller; i >= 0; i--) {
            this.vertices[i] = predecessor = this.solve(predecessor, this.vertices[i]);
        }
        for (var i = cIdx + 1, predecessor = controller; i < this.vertices.length; i++) {
            this.vertices[i] = predecessor = this.solve(predecessor, this.vertices[i]);
        }
        this.draw();
    }

    solve(head, tail) {
        return head.plus(tail.minus(head).normalize().mult(this.segmentLength));
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
