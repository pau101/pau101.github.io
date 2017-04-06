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
        this.segmentLength = 120;
        this.pointHead = new Vec(0, 0);
        this.pointTail = new Vec(0, this.segmentLength);
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        this.canvas.width = this.width = window.innerWidth;
        this.canvas.height = this.height = window.innerHeight;
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
		this.ctx.strokeStyle = this.ctx.fillStyle = "#000";
		this.ctx.lineWidth = 5;
        this.draw();
    }

    mousemove(event) {
        this.pointHead = new Vec(event.x, event.y);
		this.pointTail = this.pointHead.plus(this.pointTail.minus(this.pointHead).normalize().mult(this.segmentLength));
		this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawShape();
    }

    drawShape() {
		var p1 = this.pointHead, p2 = this.pointTail;
		this.ctx.beginPath();
		this.ctx.moveTo(p1.x, p1.y);
		this.ctx.lineTo(p2.x, p2.y);
		this.ctx.stroke();
		this.drawPoint(p1, 8);
		this.drawPoint(p2, 8);
	}

	drawPoint(point, radius) {
		this.ctx.beginPath();
		this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
		this.ctx.fill();
	}
}

function init() {
    var canvas = document.createElement("canvas");
    new LSD(canvas);
    document.getElementById("canvasPos").replaceWith(canvas);
}
