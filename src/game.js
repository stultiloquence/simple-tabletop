import { clamp, EventEmitter } from "./util.js"

export default class Game extends EventEmitter {
	
	width = 64;
	height = 64;
	entities = [
		{ type: 'goblin', x : 12, y: 15, w: 1, h: 1, selected: false },
		{ type: 'priest', x : 10, y: 14, w: 1, h: 1, selected: false },
		{ type: 'soldier', x : 9, y: 13, w: 1, h: 1, selected: false },
		{ type: 'priest', x : 11, y: 12, w: 10, h: 10, selected: false },
	];
	walls = [
		[ 6, 3, 2, 6, 2, 11, 5, 16 ],
		[ 0, 0, 10, 0, 8, 12, 20, 10 ],
	];
	selectedEntity = null;

	selectEntity = (entity) => {
		if (!entity) {
			return;
		}
		if (entity === this.selectedEntity) {
			return;
		}

		// First deselect the old entity, if any.
		const old = this.selectedEntity || null;
		if (this.selectedEntity) {
			this.selectedEntity.selected = false;
			this.selectedEntity = null;
		}

		// Then select the new one.
		entity.selected = true;
		this.selectedEntity = entity;

		this.fire("selection changed", {
			old: old,
			new: this.selectEntity,
		});
	}

	moveSelected = (dx, dy) => {
		if (!this.selectedEntity) {
			return;
		}

		const oldX = this.selectedEntity.x;
		const oldY = this.selectedEntity.y;

		this.selectedEntity.x = clamp(0, this.width, this.selectedEntity.x + dx);
		this.selectedEntity.y = clamp(0, this.height, this.selectedEntity.y + dy);

		if (oldX !== this.selectedEntity.x || oldY !== this.selectedEntity.y) {
			this.fire("entity moved", {
				entity: this.selectedEntity,
				oldX: oldX,
				oldY: oldY,
			});
		}
	}
	moveUp = () => { this.moveSelected(0, -1); }
	moveDown = () => { this.moveSelected(0, 1); }
	moveLeft = () => { this.moveSelected(-1, 0); }
	moveRight = () => { this.moveSelected(1, 0); }

	entitiesInCell = (x, y) => {
		return this.entities.filter(entity =>
			entity.x <= x
			&& entity.y <= y
			&& (entity.x + entity.w) >= x + 1
			&& (entity.y + entity.h) >= y + 1
		);
	}
};