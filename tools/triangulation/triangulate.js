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

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

class Triangulate {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.canvas.addEventListener("mousedown", (e) => this.mousedown(e));
        this.canvas.addEventListener("mouseup", (e) => this.mouseup(e));
        this.canvas.addEventListener("mousemove", (e) => this.mousemove(e));
        this.canvas.addEventListener("contextmenu", (e) => this.contextmenu(e));
        this.contour = [];
        this.triangles = [];
        this.pointSize = 4;
        this.pointSnapDistSq = this.pointSize * this.pointSize * 4;
        this.lineSnapDistSq = 20;
        this.resize();
        window.addEventListener("keydown", (e) => this.keydown(e));
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        this.canvas.width = this.width = window.innerWidth;
        this.canvas.height = this.height = window.innerHeight;
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
        this.draw();
    }

    mousedown(event) {
        if (event.button == 0) {
            this.handleLeftMouseDown(new Vec(event.x, event.y));
            this.triangulate();
            this.draw();
        }
    }

    contextmenu(event) {
        if (this.highlightPoint) {
            this.contour.remove(this.highlightPoint);
            if (this.highlightPoint == this.heldPoint) {
                delete this.heldPoint;
            }
            delete this.highlightPoint;
            this.triangulate();
            this.draw();
        }
        if (this.highlightEdge) {
            this.contour.remove(this.highlightEdge.p1);
            this.contour.remove(this.highlightEdge.p2);
            if (this.highlightEdge.p1 == this.heldPoint || this.highlightEdge.p2 == this.heldPoint) {
                delete this.heldPoint;
            }
            delete this.highlightEdge;
            this.triangulate();
            this.draw();
        }
        event.preventDefault();
    }

    handleLeftMouseDown(mouse) {
        if (this.highlightPoint) {
            this.heldPoint = this.highlightPoint;
            this.heldPoint.x = mouse.x;
            this.heldPoint.y = mouse.y;
        } else if (this.highlightEdge || this.contour.length < 2) {
            this.highlightPoint = this.heldPoint = mouse;
            this.contour.splice(this.highlightEdge ? this.highlightEdge.idx + 1 : this.contour.length, 0, mouse);
            delete this.highlightEdge;
        }
    }

    mouseup(event) {
        if (this.heldPoint) {
            delete this.heldPoint;
        }
    }

    mousemove(event) {
        if (this.heldPoint) {
            this.heldPoint.x = event.x;
            this.heldPoint.y = event.y;
            this.triangulate();
            this.draw();
        } else {
            var oldPoint = this.highlightPoint;
            delete this.highlightPoint;
            var point = new Vec(event.x, event.y);
            for (var i = 0; i < this.contour.length; i++) {
                var p = this.contour[i];
                if (p.distanceSq(point) < this.pointSnapDistSq) {
                    this.highlightPoint = p;
                    break;
                }
            }
            var oldEdge = this.highlightEdge;
            delete this.highlightEdge;
            if (!this.highlightPoint && this.contour.length > 1) {
                var mouse = new Vec(event.x, event.y);
                var idx = 0, cp1, cp2, dist = Number.POSITIVE_INFINITY;
                for (var i = 0; i < this.contour.length; i++) {
                    var p1 = this.contour[i];
                    var p2 = this.contour[(i + 1) % this.contour.length];
                    var d = this.pointSegmentDistSq(p1, p2, mouse);
                    if (d < dist) {
                        dist = d;
                        idx = i;
                        cp1 = p1;
                        cp2 = p2;
                    }
                }
                if (dist < this.lineSnapDistSq) {
                    this.highlightEdge = { p1 : cp1, p2 : cp2, idx: idx };
                }
            }
            if (oldPoint != this.highlightPoint || oldEdge != this.highlightEdge) {
                this.draw();
            }
        }
    }

    keydown(event) {
        // C
        if (event.keyCode == 67) {
            this.contour = [];
            this.triangles = [];
            delete this.heldPoint;
            delete this.highlightPoint;
            delete this.highlightEdge;
            this.draw();
        }
    }

    pointSegmentDistSq(v1, v2, p) {
        var len = v1.distanceSq(v2);
        if (len == 0) {
            return v1.distanceSq(p);
        }
        var t = Math.max(0, Math.min(1, p.minus(v1).dot(v2.minus(v1)) / len));
        var projection = v1.plus(v2.minus(v1).mult(t));
        return p.distanceSq(projection);
    }

    triangulate() {

    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.contour.length > 0) {
            this.drawShape();
        }
    }

    drawShape() {
        for (var i = 0; i < this.triangles.length; i++) {
            switch (i % 3) {
                case 0: {
                    var hue = i * 3 / this.triangles.length;
                    this.ctx.fillStyle = `hsl(${hue}, 1, 1)`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(point.x, point.y);
                    break;
                }
                case 1:
                    this.ctx.lineTo(point.x, point.y);
                    break;
                case 2:
                    this.ctx.lineTo(point.x, point.y);
                    this.ctx.closePath();
                    this.ctx.fill();
            }
        }
        if (this.highlightEdge) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 8;
            this.ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            var p1 = this.highlightEdge.p1, p2 = this.highlightEdge.p2;
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
        }
        var first = this.contour[0];
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = "#000";
        this.ctx.beginPath();
        if (this.contour.length > 1) {
            this.ctx.moveTo(first.x, first.y);
            for (var i = 1; i < this.contour.length; i++) {
                var point = this.contour[i];
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
        if (this.highlightPoint) {
            this.ctx.beginPath();
            this.ctx.arc(this.highlightPoint.x, this.highlightPoint.y, this.pointSize * 2, 0, Math.PI * 2);
            this.ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            this.ctx.fill();
        }
        this.ctx.fillStyle = "#000";
        for (var i = 0; i < this.contour.length; i++) {
            var point = this.contour[i];
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.pointSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

function init() {
    var canvas = document.createElement("canvas");
    new Triangulate(canvas);
    document.getElementById("canvasPos").replaceWith(canvas);
}
