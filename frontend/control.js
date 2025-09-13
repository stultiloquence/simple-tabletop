export default class Control {

	constructor(game, view, canvas) {
		this.game = game;
		this.view = view;
		this.canvas = canvas;

		window.addEventListener('keydown', this.onKeydown);

		this.canvas.addEventListener("mousedown", this.onMouseDown);
		this.canvas.addEventListener("mousemove", this.onMouseMove);
		this.canvas.addEventListener("mouseup", this.onMouseUpOrLeave);
		this.canvas.addEventListener("mouseleave", this.onMouseUpOrLeave);
		this.canvas.addEventListener("wheel", this.onWheel)

		this.canvas.addEventListener("touchdown", this.onMouseDown);
		this.canvas.addEventListener("touchmove", this.onMouseMove);
		this.canvas.addEventListener("toucheup", this.onMouseUpOrLeave);
		this.canvas.addEventListener("touchleave", this.onMouseUpOrLeave);

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

	static AWAITING_NEXT_MOUSEDOWN = 0;
	static COULD_BE_A_CLICK = 1;
	static DRAGGING = 2;
	mouseState = Control.AWAITING_NEXT_MOUSEDOWN;

	mouseDownEvent;

	mapDragInitiated = false;
	entityDragInitiated = false;
	lastDragX;
	lastDragY;
	entityDragOffsetX;
	entityDragOffsetY;

	onMouseDown = (e) => {
		// Only listen to primary mouse button click. Here the primary button is 0.
		if (e.button !== 0) {
			return;
		}

		this.mouseState = Control.COULD_BE_A_CLICK;
		this.mouseDownEvent = e;
	}

	onMouseMove = (e) => {
		// Only care about movement while primary mouse button is pressed. e.buttons is a bitmask, 1 means the primary button is pressed.
		if (!(e.buttons & 1)) {
			return;
		}

		if (this.mouseState === Control.DRAGGING) {
			this.onDrag(e);
			return;
		}

		if (this.mouseState === Control.COULD_BE_A_CLICK) {
			const dx = Math.abs(e.clientX - this.mouseDownEvent.clientX);
			const dy = Math.abs(e.clientY - this.mouseDownEvent.clientY)
			if (dx > 10 || dy > 10) {
				this.mouseState = Control.DRAGGING;
				this.onDragStart(this.mouseDownEvent);
				this.onDrag(e);
			}
		}
	}

	onMouseUpOrLeave = (e) => {
		switch (this.mouseState) {
		case Control.DRAGGING:
			this.onDragStop(e);
			break;
		case Control.COULD_BE_A_CLICK:
			this.onClick(e);
			break;
		case Control.AWAITING_NEXT_MOUSEDOWN:
			// Probably means the mouse was pressed down outside the canvas element and released inside.
			break;
		default:
			break;
		}

		this.mouseState = Control.AWAITING_NEXT_MOUSEDOWN;
	}

	// Syntethic click and drag events (not the browser's).

	onClick = (e) => {
		const { x: wx, y: wy } = this.view.viewportToWorldCoords(e.clientX, e.clientY);
		const x = Math.floor(wx);
		const y = Math.floor(wy);
		const entity = this.game.nextEntityInCell(x, y);
		this.game.selectEntity(entity);
	}

	onDragStart = (e) => {
		const { x: wx, y: wy } = this.view.viewportToWorldCoords(e.clientX, e.clientY);
		const x = Math.floor(wx);
		const y = Math.floor(wy)
		const entity = this.game.topEntityInCell(x, y);

		this.lastDragX = e.clientX;
		this.lastDragY = e.clientY;

		if (entity) {
			this.game.selectEntity(entity);
			this.entityDragInitiated = true;
			// For entities larger than 1x1, we need to remember where on the entity we clicked:
			this.entityDragOffsetX = x - entity.x;
			this.entityDragOffsetY = y - entity.y;
		} else {
			this.mapDragInitiated = true;
		}
	}

	onDrag = (e) => {
		if (this.mapDragInitiated) {
			this.view.translateViewportCoords(e.clientX - this.lastDragX, e.clientY - this.lastDragY);
		} else if (this.entityDragInitiated) {
			const { x, y } = this.view.viewportToWorldCoords(e.clientX, e.clientY);
			this.game.moveSelectedTo(
				Math.floor(x - this.entityDragOffsetX),
				Math.floor(y - this.entityDragOffsetY)
			);
		}

		this.lastDragX = e.clientX;
		this.lastDragY = e.clientY;
	}

	onDragStop = (e) => {
		this.entityDragInitiated = false;
		this.mapDragInitiated = false;
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