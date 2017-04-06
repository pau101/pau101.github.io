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
        this.canvas.addEventListener("mousemove", e => this.mousemove(e));
        this.canvas.addEventListener("mousewheel", e => this.mousewheel(e));
        this.segmentLength = 120;
        this.vertices = [ new Vec(0, 0), new Vec(0, this.segmentLength) ];
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
		this.ctx.lineWidth = 4;
        this.draw();
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

    mousemove(event) {
        this.vertices[0] = new Vec(event.x, event.y);
        this.update();
    }

    update() {
        for (var i = 1, predecessor = this.vertices[0]; i < this.vertices.length; i++) {
            this.vertices[i] = predecessor = predecessor.plus(this.vertices[i].minus(predecessor).normalize().mult(this.segmentLength));
        }
        this.draw();
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
		    this.ctx.arc(vert.x, vert.y, 10, 0, Math.PI * 2);
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
