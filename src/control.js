export default class Control {

	constructor(game, view, canvas) {
		this.game = game;
		this.view = view;
		this.canvas = canvas;

		window.addEventListener('keydown', this.onKeydown);

		this.canvas.addEventListener("mousedown", this.onMouseDown);
		this.canvas.addEventListener("mousemove", this.onMouseMove);
		this.canvas.addEventListener("mouseup", this.onMouseUp);
		this.canvas.addEventListener("mouseleave", this.onMouseLeave);
		this.canvas.addEventListener("wheel", this.onWheel)

		this.canvas.addEventListener("touchdown", this.onMouseDown);
		this.canvas.addEventListener("touchmove", this.onMouseMove);
		this.canvas.addEventListener("toucheup", this.onMouseUp);
		this.canvas.addEventListener("touchleave", this.onMouseLeave);

	}

	static PIXELS_SCROLLED_PER_LINE = 16; // We could do something complicated to figure out the exact value (see https://stackoverflow.com/questions/20110224/what-is-the-height-of-a-line-in-a-wheel-event-deltamode-dom-delta-line), but I'd say this is good enough.
	static ZOOM_FACTOR_KEYBOARD = Math.exp(-5 * Control.PIXELS_SCROLLED_PER_LINE / 500);
	static CELLS_PER_KEYPRESS = 2;

	onKeydown = (e) => {
		switch (e.key) {
		case "ArrowUp":
			if (e.ctrlKey) {
				this.view.translateWorldCoords(0, Control.CELLS_PER_KEYPRESS);
			} else {
				this.game.moveUp();
			}
			break;
		case "ArrowDown":
			if (e.ctrlKey) {
				this.view.translateWorldCoords(0, -Control.CELLS_PER_KEYPRESS);
			} else {
				this.game.moveDown();
			}
			break;
		case "ArrowLeft":
			if (e.ctrlKey) {
				this.view.translateWorldCoords(Control.CELLS_PER_KEYPRESS, 0);
			} else {
				this.game.moveLeft();
			}
			break;
		case "ArrowRight":
			if (e.ctrlKey) {
				this.view.translateWorldCoords(-Control.CELLS_PER_KEYPRESS, 0);
			} else {
				this.game.moveRight();
			}
			break;
		case "PageUp":
			e.preventDefault();
			this.view.zoomAround(
				1 / Control.ZOOM_FACTOR_KEYBOARD,
				window.innerWidth / 2,
				window.innerHeight / 2
			);
			break;
		case "PageDown":
			e.preventDefault();
			this.view.zoomAround(
				Control.ZOOM_FACTOR_KEYBOARD,
				window.innerWidth / 2,
				window.innerHeight / 2
			);
			break;
		case "Tab":
			e.preventDefault();
			this.entityDragInitiated = false; // If the selected entity changes, it would be confusing to suddenly be dragging that new entity. Moving the map around should be fine, though. 
			if (e.shiftKey) {
				this.game.selectPreviousEntity();
			} else {
				this.game.selectNextEntity();
			}
			break;
		default:
			return;
		}
	}

	mapDragInitiated = false;
	entityDragInitiated = false;
	lastDragX;	
	lastDragY;	

	onMouseDown = (e) => {
		// Only listen to primary mouse button click. Here the primary button is 0.
		if (e.button !== 0) {
			return;
		}

		const { x, y } = this.view.viewportToWorldCoords(e.clientX, e.clientY);
		const hitEntities = this.game.entitiesInCell(Math.floor(x), Math.floor(y));
		if (hitEntities.length > 0) {
			this.game.selectEntity(hitEntities[0]);
			this.entityDragInitiated = true;
		} else {
			this.mapDragInitiated = true;
		}

		this.lastDragX = e.clientX;
		this.lastDragY = e.clientY;
	}

	onMouseMove = (e) => {
		// Only care about movement while primary mouse button is pressed. e.buttons is a bitmask, 1 means the primary button is pressed.
		if (!(e.buttons & 1)) {
			return;
		}
		// Only do something if the moust was pressed down within the canvas element, either for a map drag of a entity drag.
		if (this.mapDragInitiated) {
			this.view.translateViewportCoords(e.clientX - this.lastDragX, e.clientY - this.lastDragY);
			this.lastDragX = e.clientX;
			this.lastDragY = e.clientY;
		} else if (this.entityDragInitiated) {
			const { x, y } = this.view.viewportToWorldCoords(e.clientX, e.clientY);
			this.game.moveSelectedTo(Math.floor(x), Math.floor(y));
		}
	}

	onMouseUp = (e) => {
		this.mapDragInitiated = false;
		this.entityDragInitiated = false;
	}

	onMouseLeave = (e) => {
		this.mapDragInitiated = false;
		this.entityDragInitiated = false;
	}

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