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
        this.epsilon = 1e-8;
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
        var update = false;
        if (this.highlightPoint) {
            this.contour.remove(this.highlightPoint);
            if (this.highlightPoint == this.heldPoint) {
                delete this.heldPoint;
            }
            delete this.highlightPoint;
            update = true;
        }
        if (this.highlightEdge) {
            this.contour.remove(this.highlightEdge.p1);
            this.contour.remove(this.highlightEdge.p2);
            if (this.highlightEdge.p1 == this.heldPoint || this.highlightEdge.p2 == this.heldPoint) {
                delete this.heldPoint;
            }
            delete this.highlightEdge;
            update = true;
        }
        if (update ) {
            this.triangulate();
            this.draw();
            event.preventDefault();
        }
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
        var key = event.keyCode;
        if (key == 67) { // C
            this.contour = [];
            this.triangles = [];
            delete this.heldPoint;
            delete this.highlightPoint;
            delete this.highlightEdge;
            this.draw();
        } else if (key == 83 && this.contour.length > 1) { // S
            var first = this.contour[0];
            var len = this.contour.length;
            for (var i = 0; i < len;) {
                this.contour[i++] = this.contour[i];
            }
            this.contour[len - 1] = first;
            this.triangulate();
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
        this.triangles = [];
        var n = this.contour.length;
        if (n < 3) {
            return;
        }
        var v = new Array(n);
        v.fill(0);
        if (this.area(this.contour) > 0) {
            for (var i = 0; i < n; i++) v[i] = i;
        } else {
            for (var i = 0; i < n; i++) v[i] = n - 1 - i;
        }
        var nv = n;
        var count = 2 * nv;
        for (var m = 0, i = nv - 1; nv > 2;) {
            if (count-- <= 0) {
                return;
            }
            var u = i >= nv ? 0 : i;
            i = u + 1;
            if (i >= nv) {
                i = 0;
            }
            var w = i + 1;
            if (w >= nv) {
                w = 0;
            }
            if (this.snip(this.contour, u, i, w, nv, v)) {
                var a = v[u], b = v[i], c = v[w];
                this.triangles.push(this.contour[a]);
                this.triangles.push(this.contour[b]);
                this.triangles.push(this.contour[c]);
                m++;
                for (var s = i, t = i + 1; t < nv; s++, t++) {
                    v[s] = v[t];
                }
                nv--;
                count = 2 * nv;
            }
        }
    }

    area(contour) {
        var a = 0;
        for (var p = contour.length - 1, q = 0; q < contour.length; p = q++) {
            a += contour[p].x * contour[q].y - contour[q].x * contour[p].y;
        }
        return a / 2;
    }

    snip(contour, u, i, w, n, v) {
        var ax = contour[v[u]].x;
        var ay = contour[v[u]].y;
        var bx = contour[v[i]].x;
        var by = contour[v[i]].y;
        var cx = contour[v[w]].x;
        var cy = contour[v[w]].y;
        if (this.epsilon > (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) {
            return false;
        }
        for (var p = 0; p < n; p++) {
            if (p == u || p == i || p == w) {
                continue;
            }
            var px = contour[v[p]].x;
            var py = contour[v[p]].y;
            if (this.insideTriangle(ax, ay, bx, by, cx, cy, px, py)) {
                return false;
            }
        }
        return true;
    }

    insideTriangle(ax, ay, bx, by, cx, cy, px, py) {
        var ax  = cx - bx, ay  = cy - by;
        var bx  = ax - cx, by  = ay - cy;
        var cx  = bx - ax, cy  = by - ay;
        var apx = px - ax, apy = py - ay;
        var bpx = px - bx, bpy = py - by;
        var cpx = px - cx, cpy = py - cy;
        var aCROSSbp = ax * bpy - ay * bpx;
        var cCROSSap = cx * apy - cy * apx;
        var bCROSScp = bx * cpy - by * cpx;
        return aCROSSbp >= 0 && bCROSScp >= 0 && cCROSSap >= 0;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.contour.length > 0) {
            this.drawShape();
        }
    }

    drawShape() {
        this.ctx.lineWidth = 1;
        for (var i = 0; i < this.triangles.length; i++) {
            var point = this.triangles[i];
            switch (i % 3) {
                case 0: {
                    var hue = i / this.triangles.length * 360;
                    this.ctx.strokeStyle = this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
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
                    this.ctx.stroke();
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
        /*
        this.ctx.beginPath();
        this.ctx.arc(first.x, first.y, this.pointSize * 3, 0, Math.PI * 2);
        this.ctx.fillStyle = "rgba(255, 130, 0, 0.75)";
        this.ctx.fill(); //*/
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
