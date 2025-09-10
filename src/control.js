export default class Control {

	constructor(game, view, canvas) {
		this.game = game;
		this.view = view;
		this.canvas = canvas;

		window.addEventListener('keydown', this.onKeydown);

		this.canvas.addEventListener('click', this.onClick);
		this.canvas.addEventListener("mousedown", this.onMouseDown);
		this.canvas.addEventListener("mousemove", this.onMouseMove);
		this.canvas.addEventListener("mouseup", this.onMouseUp);
		this.canvas.addEventListener("mouseleave", this.onMouseLeave);
		this.canvas.addEventListener("wheel", this.onWheel)
	}

	onKeydown = (e) => {
		switch (e.key) {
		case "ArrowUp":
			this.game.moveUp();
			break;
		case "ArrowDown":
			// const start = performance.now();
			this.game.moveDown();
			// const stop = performance.now();
			// if (!window.moveDownTimes) {
			// 	window.moveDownTimes = []
			// }
			// window.moveDownTimes.push(stop - start);
			// console.log("Down avg:", window.moveDownTimes.reduce((x, y) => x + y, 0) / window.moveDownTimes.length);
			break;
		case "ArrowLeft":
			this.game.moveLeft();
			break;
		case "ArrowRight":
			this.game.moveRight();
			break;
		default:
			return;
		}
	}

	onClick = (e) => {
		const { x, y } = this.view.viewportToWorldCoords(e.clientX, e.clientY);
		const hitEntities = this.game.entitiesInCell(Math.floor(x), Math.floor(y));
		this.game.selectEntity(hitEntities[0]);
	}

	dragInitiated = false;
	lastDragX;	
	lastDragY;	

	onMouseDown = (e) => {
		// Only listen to primary mouse button click. Here the primary button is 0.
		if (e.button !== 0) {
			return;
		}
		this.dragInitiated = true;
		this.lastDragX = e.clientX;
		this.lastDragY = e.clientY;
	}

	onMouseMove = (e) => {
		// Only care about movement while primary mouse button is pressed. e.buttons is a bitmask, 1 means the primary button is pressed.
		if (!(e.buttons & 1)) {
			return;
		}
		// Only do drag if the moust was pressed down within the canvas element.
		if (!this.dragInitiated) {
			return;
		}
		this.view.translate(e.clientX - this.lastDragX, e.clientY - this.lastDragY);
		this.lastDragX = e.clientX;
		this.lastDragY = e.clientY;
	}

	onMouseUp = (e) => {
		this.dragInitiated = false
	}

	onMouseLeave = (e) => {
		this.dragInitiated = false;
	}

	static PIXELS_SCROLLED_PER_LINE = 16; // We could do something complicated to figure out the exact value (see https://stackoverflow.com/questions/20110224/what-is-the-height-of-a-line-in-a-wheel-event-deltamode-dom-delta-line), but I'd say this is good enough.

	onWheel = (e) => {
		if (!(e.deltaMode === 0 || e.deltaMode === 1)) {
			// We only support scrolling reported in pixels or lines.
			return;
		}

		const deltaInPixels = (e.deltaMode === 1)
			? Control.PIXELS_SCROLLED_PER_LINE * e.deltaY
			: e.deltaY;
		const zoomFactor = Math.exp(-deltaInPixels / 500)

		this.view.zoomAround(zoomFactor, e.clientX, e.clientY);
	}
}