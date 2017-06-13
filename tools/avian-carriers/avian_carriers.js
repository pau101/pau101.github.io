Node.prototype.replaceWith = function(replacee) {
    this.parentNode.replaceChild(this, replacee);
};

Math.clamp = function(x, min, max) {
    return Math.max(Math.min(x, max), min);
}

Math.wrap = function(a, b) {
    return (a % b + b) % b;
}

class Package {
    constructor(source, destination, message) {
        this.source = source;
        this.destination = destination;
        this.message = message;
    }

    toString() {
        return this.message;
    }
}

class Entity {
    constructor(world, x, y) {
        this.world = world;
        this.x = x;
        this.y = y;
    }

    move(dx, dy) {
        this.x = Math.wrap(this.x + dx, this.world.getWidth());
        this.y = Math.wrap(this.y + dy, this.world.getHeight());
    }

    tick() {}

    draw(ctx) {}
}

class Pigeon extends Entity {
    constructor(world, x, y) {
        super(world, x, y);
        this.yaw = Math.random() * Math.PI * 2;
        this.speed = 0;
        this.size = 6;
        this.color = "black";
        this.node = null;
        this.package = null;
        this.flapOffset = Math.random() * Math.PI * 2;
    }

    carryTo(target, message) {
        this.package = new Package(this.node, target, message);
        this.speed = 1;
        delete this.node;
    }

    tick() {
        if (this.speed) {
            this.move(Math.cos(this.yaw) * this.speed, Math.sin(this.yaw) * this.speed);
            if (this.package) {
                var dest = this.package.destination;
                var vx = dest.x - this.x;
                var vy = dest.y - this.y;
                var dist = Math.sqrt(vx * vx + vy * vy);
                if (dist < dest.size / 2) {
                    this.deliver();
                } else {
                    this.yaw += (Math.wrap(Math.atan2(vy, vx) - this.yaw + Math.PI, Math.PI * 2) - Math.PI) * Math.clamp(2 / dist, 0.01, 1);
                }
            }
        }
    }

    deliver() {
        if (this.package.source) {
            this.carryTo(this.package.source, "");
        } else {
            this.package.destination.addPigeon(this);
            this.speed = 0;
            delete this.package;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.package) {
            ctx.font = "10px Lucida Sans Unicode";
            var text = this.package.toString();
            ctx.fillText(text, -ctx.measureText(text).width / 2, -6);
        }
        ctx.rotate(this.yaw - Math.PI / 2);
        ctx.scale(this.size * (!this.speed || Math.sin(new Date / 150 + this.flapOffset)), this.size);
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(-Math.sqrt(3) / 2, -1 / 2);
        ctx.lineTo(Math.sqrt(3) / 2, -1 / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class NetNode extends Entity {
    constructor(world, x, y, color, text, textColor) {
        super(world, x, y);
        this.size = 18;
        this.color = color;
        this.text = text;
        this.textColor = textColor || "black";
        this.pigeons = [];
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        if (this.text) {
            ctx.fillStyle = this.textColor;
            var metrics = ctx.measureText(this.text);
            ctx.fillText(this.text, this.x - metrics.width / 2, this.y - this.size / 2 - 12);
        }
    }

    addPigeon(pigeon) {
        pigeon.node = this;
        this.pigeons.push(pigeon);
    }
}

class Home extends NetNode {
    constructor(world, x, y, text) {
        super(world, x, y, "#0097C5", text);
    }

    tick() {
        if (this.pigeons.length > 0 && Math.random() < 0.001) {
            var node = this.world.getRandomHouse(this);
            if (node) {
                var pigeon = this.pigeons.pop();
                pigeon.carryTo(node, "Hello, World!");
            }
        }
    }
}

class ControlCenter extends NetNode {
    constructor(world, x, y, color) {
        super(world, x, y, color, "Pigeon Farm");
    }
}

class World {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.pigeons = []
        this.nodes = []
        this.houses = []
        this.resize();
        this.pigeonsPerHouse = 5;
        this.generateNetwork();
        window.addEventListener("resize", () => this.resize());
        window.setInterval(() => this.tick(), 10);
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getRandomHouse(excluding) {
        if (this.houses.length < 2) {
            return null;
        }
        var node;
        do {
            node = this.houses[Math.random() * this.houses.length | 0];
        } while (node === excluding);
        return node;
    }

    spawnPigeon(pigeon) {
        this.pigeons.push(pigeon);
    }

    generateNetwork() {
        var nodes = 5;
        var pad = 40;
        var radOffset = Math.random() * Math.PI * 2;
        var max = Math.max(Math.min(this.width / 2, this.height / 2) - pad, 1);
        var min = 120;
        var centerX = this.width / 2;
        var centerY = this.height / 2;
        for (var n = 0; n < nodes; n++) {
            var rad = n / nodes * Math.PI * 2 + radOffset;
            var dist =  Math.random() * (max - min) + min;
            var x = centerX + Math.cos(rad) * dist;
            var y = centerY + Math.sin(rad) * dist;
            var home = new Home(this, x, y, "Home #" + (n + 1));
            for (var i = 0; i < this.pigeonsPerHouse; i++) {
                var pigeon = new Pigeon(this, x + Math.random() * 20 - 10, y + Math.random() * 20 - 10);
                this.spawnPigeon(pigeon);
                home.addPigeon(pigeon);
            }
            this.nodes.push(home);
            this.houses.push(home);
        }
        this.nodes.push(new ControlCenter(this, centerX, centerY, "#BF4034"));
    }

    resize() {
        this.canvas.width = this.width = window.innerWidth;
        this.canvas.height = this.height = window.innerHeight;
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
        this.ctx.strokeStyle = "black";
        this.ctx.fillStyle = "white";
        this.ctx.lineWidth = 4;
        this.ctx.font = "14px Lucida Sans Unicode";
        this.draw();
    }

    tick() {
        this.pigeons.forEach(pigeon => pigeon.tick());
        this.nodes.forEach(node => node.tick());
        window.requestAnimationFrame(() => this.draw());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.nodes.forEach(node => node.draw(this.ctx));
        this.pigeons.forEach(pigeon => pigeon.draw(this.ctx));
    }
}

function init() {
    var canvas = document.createElement("canvas");
    new World(canvas);
    document.getElementById("canvasPos").replaceWith(canvas);
}
