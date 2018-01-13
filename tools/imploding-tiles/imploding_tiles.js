(function () {
	var canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d", { alpha: false }),
		cursor = { pos: [ -1, -1 ], update: dormant },
		points = [ cursor ],
		width,
		height,
		radius = 5,
		gridWidth = 36,
		gridHeight,
		cellSize,
		cellRadius;
	canvas.addEventListener("pointerdown", mousedown);
	canvas.addEventListener("pointermove", mousemove);
	canvas.addEventListener("pointerleave", mouseleave);
	window.addEventListener("resize", resize);
	window.setInterval(tick, 10);
	resize();
	document.body.appendChild(canvas);

	function mousedown(event) {
		points.push({
			pos: createMousePoint(event),
			update: move,
			yaw: Math.random() * Math.PI * 2,
			yawDelta: 0
		});
	}

	function mousemove(event) {
		cursor.pos = createMousePoint(event);
	}

	function mouseleave(event) {
		cursor.pos = [ -1, -1 ];
	}

	function createMousePoint(event) {
		return [ event.clientX / cellSize, event.clientY / cellSize ];
	}

	function resize() {
		canvas.width = width = window.innerWidth;
		canvas.height = height = window.innerHeight;
		gridHeight = height * gridWidth / width | 0;
		cellSize = width / gridWidth;
		cellRadius = cellSize * Math.sqrt(2) / 2;
		ctx.strokeStyle = "white";
		ctx.lineWidth = Math.max(1, cellSize / 6);
		ctx.lineJoin = "round";
		ctx.fillStyle = "white";
		draw();
	}

	function tick() {
		for (var i = 0; i < points.length; i++) {
			points[i].update(points[i]);
		}
		window.requestAnimationFrame(draw);
	}

	function dormant() {}

	function move(point) {
		var p = point.pos;
		p[0] += Math.cos(point.yaw) * 0.05;
		p[1] += Math.sin(point.yaw) * 0.05;
		if (p[0] > gridWidth) {
			p[0] -= gridWidth;
		}
		if (p[1] > gridHeight) {
			p[1] -= gridHeight;
		}
		if (p[0] < 0) {
			p[0] += gridWidth;
		}
		if (p[1] < 0) {
			p[1] += gridHeight;
		}
		point.yaw += point.yawDelta;
		point.yawDelta *= 0.7;
		point.yawDelta += (Math.random() - Math.random()) * Math.random() * 0.2;
	}

	function draw() {
		ctx.clearRect(0, 0, width, height);
		var lw = ctx.lineWidth;
		var r = 0.5 - lw / cellSize / 1.5;
		var offsets = [
			[ 0, 0 ],
			[ -1, -1 ],
			[ 0, -1 ],
			[ 1, -1 ],
			[ 1, 0, ],
			[ 1, 1 ],
			[ 0, 1 ],
			[ -1, 1 ],
			[ -1, 0 ]
		];
		var positions = [];
		for (var i = 0; i < points.length; i++) {
			if (points[i] == cursor && cursor.pos[0] < 0) {
				continue;
			}
			var p = points[i].pos,
				px = p[0],
				py = p[1];
			for (var n = 0; n < offsets.length; n++) {
				var d = offsets[n],
					x = px + d[0] * gridWidth,
					y = py + d[1] * gridHeight;
				if (x + radius > 0 || y + radius > 0 || x - radius <= gridWidth || y - radius <= gridHeight) {
					positions.push([ x, y ]);
				}
			}
		}
		for (var y = 0; y < gridHeight; y++) {
			for (var x = 0; x < gridWidth; x++) {
				var verts = [
					[ -r, -r ],
					[ r, -r ],
					[ r, r ],
					[ -r, r ]
				];
				var cx = x + 0.5,
					cy = y + 0.5;
				var scale = 1;
				for (var i = 0; i < verts.length; i++) {
					var vert = verts[i],
						vx = cx + vert[0],
						vy = cy + vert[1],
						weight = 1;
					for (var n = 0; n < positions.length; n++) {
						var p = positions[n],
							dist = Math.sqrt(Math.pow(vx - p[0], 2) + Math.pow(vy - p[1], 2)) / radius;
						if (dist < 1) {
							var cdist = Math.sqrt((cx - p[0]) * (cx - p[0]) + (cy - p[1]) * (cy - p[1]));
							var d;
							if (cdist < 1) {
								d = cdist * cdist * dist
								if (cdist > 0.5) {
									scale = cdist * 2 - 1;
								} else {
									d = 0;
									scale = 0;
								}
							} else {
								d = dist;
							}
							if (d < weight) {
								weight = d;							
							}
						}
					}
					verts[i][0] = (x + 0.5 + verts[i][0] * weight) * cellSize;
					verts[i][1] = (y + 0.5 + verts[i][1] * weight) * cellSize;
				}
				ctx.lineWidth = lw * scale;
				ctx.beginPath();
				ctx.moveTo(verts[0][0], verts[0][1]);
				for (var i = 1; i < verts.length; i++) {
					ctx.lineTo(verts[i][0], verts[i][1]);				
				}
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			}
		}
		ctx.lineWidth = lw;
	}
})();
