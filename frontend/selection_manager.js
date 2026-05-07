import { EventEmitter } from './util.js';

import Game from './game.js';
import SyncedGame from './synced_game.js';

export default class SelectedEntity extends EventEmitter {

	syncedGame;
	selected = null;

	constructor(syncedGame) {
		super();
		this.syncedGame = syncedGame;
		this.syncedGame.on("speculative game reset", () => {
			this.selected = null;
		});
	}

	selectEntity = (entity) => {
		if (!entity) {
			return;
		}
		if (entity === this.selected) {
			return;
		}

		const old = this.selected;
		this.selected = entity;

		this.emit("selection changed", {
			old: old,
			new: this.selectEntity,
		});
	};

	// in (English) "reading order". Ties broken by entity.id, so this comparator only returns 0 for equal entities.
	static readingOrder = (entityA, entityB) => {
		const dy = entityA.y - entityB.y;
		if (dy !== 0) {
			return dy;
		}
		const dx = entityA.x - entityB.x;
		if (dx !== 0) {
			return dx;
		}
		return entityA.id - entityB.id;
	}

	getNextEntity = (comparator) => {
		if (this.syncedGame.speculativeGame.entities.length === 0) {
			return null;
		}

		const min = (a, b) => (comparator(a, b) < 0) ? a : b;

		if (!this.selected) {
			return this.syncedGame.speculativeGame.entities.reduce(min);
		}

		// Select next entity after this.selected in order of ascending y, then ascending x coordinate. If there is none, start at the beginning again.
		const subsequentEntities = this.syncedGame.speculativeGame.entities
			.filter(entity => comparator(this.selected, entity) < 0);
		if (subsequentEntities.length === 0) {
			return this.syncedGame.speculativeGame.entities.reduce(min);
		}

		return subsequentEntities.reduce(min);
	}

	selectNext = () => {
		this.selectEntity(this.getNextEntity(SelectionManager.readingOrder));
	}

	selectPrevious = () => {
		this.selectEntity(this.getNextEntity((a, b) => -SelectionManager.readingOrder(a, b)));
	}


	// First entity in this cell according to SelectionManager.readingOrder. If this.selected is in this cell, instead select the next entity in the cell according to reading order.
	// Returns undefined if there are no entities in the cell.
	getNextEntityInCell = (x, y) => {
		const min = (a, b) => (SelectionManager.readingOrder(a, b) < 0) ? a : b;

		const entitiesInCell = this.syncedGame.speculativeGame.entities
			.filter(e => Game.isEntityWithinCell(x, y, e))
			.sort(SelectionManager.readingOrder);

		if (entitiesInCell.length === 0) {
			return undefined;
		}

		const selectedIndex = entitiesInCell.indexOf(this.selected);
		const nextIndex = (selectedIndex + 1) % entitiesInCell.length; // Uses the fact that .indexOf returns -1 if the entity is not present.

		return entitiesInCell[nextIndex];
	};

	selectNextEntityInCell = (x, y) => {
		const next = this.getNextEntityInCell(x, y);
		this.selectEntity(next);
	};
}