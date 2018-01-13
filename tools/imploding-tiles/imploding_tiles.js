(function () {
    var canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d", { alpha: false }),
		points = [],
		width,
		height,
		radius = 5,
		gridWidth = 36,
		gridHeight,
		cellSize,
		cellRadius;
	canvas.addEventListener("pointermove", mousemove);
	resize();
    document.body.appendChild(canvas);

	function mousemove(event) {
		var x = event.clientX;
		var y = event.clientY;
		points.pop();
		points.push([ x / cellSize, y / cellSize ]);
		draw();
	}

    function resize() {
        canvas.width = width = window.innerWidth;
        canvas.height = height = window.innerHeight;
        gridHeight = height * gridWidth / width | 0;
        cellSize = width / gridWidth;
        cellRadius = cellSize * Math.sqrt(2) / 2;
        ctx.fillStyle = "white";
        draw();
    }

	function draw() {
		ctx.clearRect(0, 0, width, height);
		for (var y = 0; y < gridHeight; y++) {
			for (var x = 0; x < gridWidth; x++) {
				var r = 0.5;
				var verts = [
					[ -r, -r ],
					[ r, -r ],
                    [ r, r ],
                    [ -r, r ]
				];
				var cx = x + 0.5,
					cy = y + 0.5;
				for (var i = 0; i < verts.length; i++) {
					var vert = verts[i],
						vx = cx + vert[0],
						vy = cy + vert[1],
						weight = 1;
					for (var n = 0; n < points.length; n++) {
						var p = points[n],
							dist = Math.sqrt(Math.pow(vx - p[0], 2) + Math.pow(vy - p[1], 2)) / radius;
						if (dist < 1) {
							var cdist = Math.sqrt(Math.pow(cx - p[0], 2) + Math.pow(cy - p[1], 2));
							var d = cdist < 1 ? cdist * dist : dist;
							if (d < weight) {
								weight = d;							
							}
						}
					}
					verts[i][0] = (x + 0.5 + verts[i][0] * weight) * cellSize;
					verts[i][1] = (y + 0.5 + verts[i][1] * weight) * cellSize;
				}
				ctx.beginPath();
				ctx.moveTo(verts[0][0], verts[0][1]);
				for (var i = 1; i < verts.length; i++) {
					ctx.lineTo(verts[i][0], verts[i][1]);				
				}
				ctx.closePath();
				ctx.fill();
			}
		}
	}
})();
