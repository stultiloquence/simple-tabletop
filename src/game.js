import { clamp, EventEmitter } from "./util.js"

export default class Game extends EventEmitter {
	
	width = 64;
	height = 64;
	entities = [
		{ type: 'goblin', x : 5, y: 5, w: 1, h: 1, selected: false,
			vision: true, visionRange: 12, visionId: 0, visionCenterX: 0.5, visionCenterY: 0.5 },
		{ type: 'priest', x : 10, y: 14, w: 1, h: 1, selected: false,
			vision: false },
		{ type: 'soldier', x : 9, y: 13, w: 1, h: 1, selected: false,
			vision: true, visionRange: 12, visionId: 1 },
		{ type: 'priest', x : 11, y: 12, w: 1, h: 1, selected: false,
			vision: false },
	];
	walls = [
		[ 3, 3, 3, 6 ],
		[ 0, 0, 10, 0, 8, 12, 20, 10 ],
	];
	visionMap;
	static SEEN_BEFORE = (1 << 31) >>> 0;
	static CURRENTLY_VISIBLE = ~Game.SEEN_BEFORE;
	selectedEntity = null;

	constructor() {
		super();
		this.visionMap = new Uint32Array(this.width * this.height);

		for (const entity of this.entities) {
			if (entity.vision) {
				this.#addVisibility(
					entity.visionId,
					entity.x,
					entity.y,
					entity.visionRange
				);
			}
		}
	}

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
	};

	// in (English) "reading order". Ties broken by earlier position in this.entities, so this comparator never returns 0.
	#readingOrder = (entityA, entityB) => {
		const dy = entityA.y - entityB.y;
		if (dy !== 0) {
			return dy;
		}
		const dx = entityA.x - entityB.x;
		if (dx !== 0) {
			return dx;
		}
		return this.entities.indexOf(entityA) - this.entities.indexOf(entityB);
	}

	#selectNextEntity = (comparator) => {
		if (this.entities.length === 0) {
			return;
		}

		const min = (a, b) => (comparator(a, b) < 0) ? a : b;

		if (!this.selectedEntity) {
			this.selectEntity(this.entities.reduce(min));
			return;
		}

		// Select next entity after this.selectedEntity in order of ascending y, then ascending x coordinate. If there is none, start at the beginning again.
		const subsequentEntities = this.entities
			.filter(entity => comparator(this.selectedEntity, entity) < 0);
		if (subsequentEntities.length === 0) {
			this.selectEntity(this.entities.reduce(min));
			return;
		}

		const next = subsequentEntities.reduce(min);
		this.selectEntity(next);
	}

	selectNextEntity = () => {
		this.#selectNextEntity(this.#readingOrder);
	}

	selectPreviousEntity = () => {
		this.#selectNextEntity((a, b) => -this.#readingOrder(a, b));
	}

	moveSelectedTo = (x, y) => {
		const selected = this.selectedEntity;
		if (!selected) {
			return;
		}

		const oldX = selected.x;
		const oldY = selected.y;
		const newX = clamp(0, this.width - 1, x);
		const newY = clamp(0, this.height - 1, y);

		if (newX === oldX && newY === oldY) {
			return;
		}

		const distance = Game.distance(newX - oldX, newY - oldY);
		let blocked = false;
		for (const [ a, b, c, d, ] of this.#relevantWallSegments(oldX, oldY, distance)) {
			if (Game.prohibitsMovement(a, b, c, d, oldX + 0.5, oldY + 0.5, newX + 0.5, newY + 0.5)) {
				blocked = true;
				break;
			}
		}
		if (blocked) {
			return;
		}

		selected.x = newX;
		selected.y = newY;
		this.#updateVisibility(selected.visionId, oldX, oldY, newX, newY, selected.visionRange);

		this.fire("entity moved", {
			entity: selected,
			oldX: oldX,
			oldY: oldY,
		});
	}
	moveSelectedBy = (dx, dy) => {
		const selected = this.selectedEntity;
		if (!selected) {
			return;
		}
		this.moveSelectedTo(selected.x + dx, selected.y + dy);
	};
	moveUp = () => { this.moveSelectedBy(0, -1); };
	moveDown = () => { this.moveSelectedBy(0, 1); };
	moveLeft = () => { this.moveSelectedBy(-1, 0); };
	moveRight = () => { this.moveSelectedBy(1, 0); };

	entitiesInCell = (x, y) => {
		return this.entities.filter(entity =>
			entity.x <= x
			&& entity.y <= y
			&& (entity.x + entity.w) >= x + 1
			&& (entity.y + entity.h) >= y + 1
		);
	};

	*#relevantWallSegments(x, y, r) {
		// todo: Since walls rarely change, we could do some precomputation to only return a subset of walls here.
		for (const wall of this.walls) {
			for (let i = 0; i <= wall.length - 4; i += 2) {
				yield [ wall[i], wall[i+1], wall[i+2], wall[i+3] ];
			}
		}
	}

	static distance = (dx, dy) => {
		const min = Math.min(dx, dy);
		const max = Math.max(dx, dy);
		return max + (min >> 1);
	};

	static maximalY = (x, d) => {
		const y = d - (x >> 1);
		if (x <= y) {
			return y;
		} else {
			return ((d - x) << 1) + 1;
		}
	};

	// return === 0: never seen before.
	// return & Game.CURRENTLY_VISIBLE: currently in vision of at least one player.
	// return & Game.SEEN_BEFORE: has been in vision at some point (possibly also currently visible).
	getVisibility = (x, y) => {
		return this.visionMap[y * this.width + x];
	};

	*opaqueCells() {
		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				if (this.getVisibility(x, y) === 0) {
					yield [x, y];
				}
			}
		}
	}

	*seenBeforeCells() {
		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				if (this.getVisibility(x, y) === Game.SEEN_BEFORE) {
					yield [x, y];
				}
			}
		}
	}

	#clearVisibility = (id, x, y, r) => {
		const deletionBitmask = ~(1 << id);

		for (let i = Math.max(x - r, 0); i <= Math.min(x + r, this.width - 1); i++) {
			const maxY = Game.maximalY(Math.abs(i - x), r);
			for (let j = Math.max(y - maxY, 0); j <= Math.min(y + maxY, this.height - 1); j++) {
				this.visionMap[j * this.width + i] &= deletionBitmask;
			}
		}
	};

	static EPSILON = 0.0001;

	// Do the line segments (a, b)--(c, d) and (e, f)--(g, h) intersect for the purposes of looking through walls?
	// We allow players to see points that are exactly collinear with a corner, so this is more liberal (= detects fewer intersections) than Game.prohibitsMovement. Notice the signs in front of the EPSILON.
	static blocksVision = (a, b, c, d, e, f, g, h) => {
		const determinant = (a - c) * (f - h) - (e - g) * (b - d);
		if (determinant === 0) {
			return false; // This is a design decision. If the line of sight is parallel to the wall, we say the player can see alongside it.
		}

		const v = (f - h) * (g - c) + (g - e) * (h - d);
		const w = - ((d - b) * (g - c) + (a - c) * (h - d));
		return (-Game.EPSILON <= v / determinant)
			&& (v / determinant <= 1 + Game.EPSILON)
			&& (-Game.EPSILON <= w / determinant)
			&& (w / determinant <= 1 + Game.EPSILON);
	};

	// Do the line segments (a, b)--(c, d) and (e, f)--(g, h) intersect for the purposes of movement close to walls?
	// We allow players to see points that are exactly collinear with a corner, so this is more conservative (= detects more intersections) than Game.blocksVision. Notice the signs in front of the EPSILON.
	static prohibitsMovement = (a, b, c, d, e, f, g, h) => {
		const determinant = (a - c) * (f - h) - (e - g) * (b - d);
		if (determinant === 0) {
			return false; // If the movement is parallel to the wall, it is allowed.
		}

		const v = (f - h) * (g - c) + (g - e) * (h - d);
		const w = - ((d - b) * (g - c) + (a - c) * (h - d));

		return (Game.EPSILON <= v / determinant)
			&& (v / determinant <= 1 - Game.EPSILON)
			&& (Game.EPSILON <= w / determinant)
			&& (w / determinant <= 1 - Game.EPSILON);
	};

	#addVisibility = (id, x, y, r) => {
		const addBitmask = Game.SEEN_BEFORE | (1 << id);

		for (let i = Math.max(x - r, 0); i <= Math.min(x + r, this.width - 1); i++) {
			const maxY = Game.maximalY(Math.abs(i - x), r);
			for (let j = Math.max(y - maxY, 0); j <= Math.min(y + maxY, this.height - 1); j++) {
				let visible = true;
				for (const [a, b, c, d] of this.#relevantWallSegments(x, y, r)) {
					// We add 0.5 to the x and y values because we say a square is visible from another square if the line connecting their centers does not intersect any walls.
					if (Game.blocksVision(a, b, c, d, x + 0.5, y + 0.5, i + 0.5, j + 0.5)) {
						visible = false;
						break;
					}
				}
				if (visible) {
					this.visionMap[j * this.width + i] |= addBitmask;
				}
			}
		}
	};

	#updateVisibility = (id, x1, y1, x2, y2, r) => {
		this.#clearVisibility(id, x1, y1, r);
		this.#addVisibility(id, x2, y2, r);
	};
};

globalThis.Game = Game