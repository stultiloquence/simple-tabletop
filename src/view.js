import { clamp } from "./util.js";

class Transform {

}

export default class View {

	imageURLs = {
		'goblin': './images/hobgoblin.png',
		'priest': './images/priest.png',
		'soldier': './images/warforged.png',
	};
	images;

	static MIN_ZOOM = 0.1 * 32;
	static MAX_ZOOM = 10.0 * 32;
	s = 32;
	e = 0;
	f = 0;
	getTransform = () => {
		return new DOMMatrix([this.s, 0, 0, this.s, this.e, this.f]);
	}

	game;
	canvas;
	ctx;


	constructor (game, canvas) {
		this.game = game;
		this.canvas = canvas;
		this.ctx = this.canvas.getContext('2d');
		this.#loadImages();

		this.ctx.imageSmoothingEnabled = false;

		game.on("selection changed", this.render);
		game.on("entity moved", this.render);
	}

	#loadImages = () => {
		this.images = {};
		let loaded = 0;
		const total = Object.keys(this.imageURLs).length;
		for (const entityType in this.imageURLs) {
			const img = new Image();
			img.src = this.imageURLs[entityType];
			img.onload = () => {
				loaded++;
				if (loaded >= total) {
					this.render();
				}
			}
			this.images[entityType] = img;
		}
	}

	renderGrid = () => {
		this.ctx.beginPath();
		let c = 0;
		for (let i = 0; i <= this.game.width; i++) {
			this.ctx.moveTo(c, 0);
			this.ctx.lineTo(c, this.game.height);
			c += 1;
		}
		c = 0;
		for (let i = 0; i <= this.game.height; i++) {
			this.ctx.moveTo(0, c);
			this.ctx.lineTo(this.game.width, c);
			c += 1;
		}
		this.ctx.lineWidth = 0.2 / 32;
		this.ctx.stroke();
	}

	renderEntity = (entity) => {
		this.ctx.save();
		if (entity.selected) {
			this.ctx.shadowColor = "#1e81b0";
			this.ctx.shadowBlur = 15;
		}
		this.ctx.drawImage(
			this.images[entity.type],
			entity.x, entity.y, entity.w, entity.h
		);
		this.ctx.restore();
	}

	renderWall = (wall) => {
		this.ctx.save();
		this.ctx.lineWidth = 3 / 32;
		this.ctx.beginPath();
		this.ctx.moveTo(wall[0], wall[1]);
		for (let i = 2; i < wall.length - 1; i += 2) {
			this.ctx.lineTo(wall[i], wall[i + 1]);
		}
		this.ctx.stroke();
		this.ctx.restore();
	}

	renderVision = () => {
		this.ctx.fillStyle = "#000";
		for (const [x, y] of this.game.opaqueCells()) {
			this.ctx.fillRect(x, y, 1, 1);
		}
		this.ctx.fillStyle = "#0008";
		for (const [x, y] of this.game.seenBeforeCells()) {
			this.ctx.fillRect(x, y, 1, 1);
		}
	}

	render = () => {
		this.ctx.resetTransform();
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.ctx.setTransform(this.getTransform());
		this.renderGrid();
		for (const entity of this.game.entities) {
			this.renderEntity(entity);
		}
		for (const wall of this.game.walls) {
			this.renderWall(wall);
		}
		this.renderVision();
	}

	// viewport coordinates are event.clientX, event.clientY
	// canvas coordinates are values within [0, this.canvas.width] and [0, this.canvas.height], respectively.
	// world coordinates are those of the game object.
	#viewportToCanvasCoords = (clientX, clientY) => {
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		return {
			x: (clientX - rect.left) * scaleX,
			y: (clientY - rect.top) * scaleY,
		};
	}

	#canvasToWorldCoords = (x, y) => {
		return {
			x: (x - this.e) / this.s,
			y: (y - this.f) / this.s,
		};
	}

	viewportToWorldCoords = (clientX, clientY) => {
		const { x, y } = this.#viewportToCanvasCoords(clientX, clientY);
		return this.#canvasToWorldCoords(x, y);
	}

	#viewportToCanvasDelta = (dx, dy) => {
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		return { dx: dx * scaleX, dy: dy * scaleY };
	}


	clampTranslate = () => {
		this.e = clamp(this.s * (1 - this.game.width), this.canvas.width - this.s, this.e);
		this.f = clamp(this.s * (1 - this.game.height), this.canvas.height - this.s, this.f);
	}

	// dx and dy are (deltas) in viewport coordinates.
	translate = (dx, dy) => {
		const canvasDelta = this.#viewportToCanvasDelta(dx, dy);
		this.e = this.e + canvasDelta.dx;
		this.f = this.f + canvasDelta.dy;
		this.clampTranslate();
		this.render();
	}

	// x and y in viewport coordinates.
	zoomAround = (zoom, x, y) => {
		const canvasCoords = this.#viewportToCanvasCoords(x, y);

		const oldS = this.s;
		this.s = clamp(View.MIN_ZOOM, View.MAX_ZOOM, zoom * this.s);
		const actualZoom = this.s / oldS;

		this.e = actualZoom * this.e + (1 - actualZoom) * canvasCoords.x;
		this.f = actualZoom * this.f + (1 - actualZoom) * canvasCoords.y;

		this.clampTranslate();

		this.render();
	}

}