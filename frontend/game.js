import { clamp, EventEmitter } from "./util.js"

export default class Game extends EventEmitter {
	
	width = 64;
	height = 64;

	// The order of entities in this array matters. Entities further back are considered on top of previous entities. The last entry is always this.selectedEntity (if the latter is not null).
	entities = [
		{ id: 0, type: 'goblin', x : 5, y: 5, w: 1, h: 1, selected: false,
			vision: true, visionRange: 12, visionId: 0 },
		{ id: 1, type: 'priest', x : 10, y: 14, w: 1, h: 1, selected: false,
			vision: false },
		{ id: 2, type: 'soldier', x : 9, y: 13, w: 4, h: 4, selected: false,
			vision: true, visionRange: 12, visionId: 1 },
		{ id: 3, type: 'priest', x : 11, y: 12, w: 1, h: 1, selected: false,
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
				this.#addVisibility(entity);
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

		// Move to the back of this.entities
		this.entities.splice(this.entities.indexOf(entity), 1);
		this.entities.push(entity);

		this.fire("selection changed", {
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
		this.#selectNextEntity(Game.readingOrder);
	}

	selectPreviousEntity = () => {
		this.#selectNextEntity((a, b) => -Game.readingOrder(a, b));
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
		const entityCenterX = selected.w / 2;
		const entityCenterY = selected.h / 2;
		for (const [ a, b, c, d ] of this.#relevantWallSegments(oldX, oldY, distance)) {
			if (Game.intersect(a, b, c, d,
				oldX + entityCenterX, oldY + entityCenterY, newX + entityCenterX, newY + entityCenterY)) {
				blocked = true;
				break;
			}
		}
		if (blocked) {
			return;
		}

		this.#clearVisibility(selected);
		selected.x = newX;
		selected.y = newY;
		this.#addVisibility(selected);

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

	static isEntityWithinCell = (x, y, entity) => {
		return entity.x <= x
			&& entity.y <= y
			&& (entity.x + entity.w) >= x + 1
			&& (entity.y + entity.h) >= y + 1;
	}

	// First entity in this cell according to Game.readingOrder. If this.selectedEntity is in this cell, instead select the next entity in the cell according to reading order.
	// Returns undefined if there are no entities in the cell.
	nextEntityInCell = (x, y) => {
		const min = (a, b) => (Game.readingOrder(a, b) < 0) ? a : b;

		const entitiesInCell = this.entities
			.filter(e => Game.isEntityWithinCell(x, y, e))
			.sort(Game.readingOrder);

		if (entitiesInCell.length === 0) {
			return undefined;
		}

		const selectedIndex = entitiesInCell.indexOf(this.selectedEntity);
		const nextIndex = (selectedIndex + 1) % entitiesInCell.length; // Uses the fact that .indexOf returns -1 if the entity is not present.

		return entitiesInCell[nextIndex];
	};

	// top means last in the this.entities array.
	// Returns undefined if there are no entities in the cell.
	topEntityInCell = (x, y) => {
		const entitiesInCell = this.entities
			.filter(e => Game.isEntityWithinCell(x, y, e));
		return entitiesInCell[entitiesInCell.length - 1];
	}

	// r is optional. If r is provided, potentially some optimization is done, otherwise all wall segments are returned.
	*#relevantWallSegments(x, y, r) {
		// todo: Since walls rarely change, we could do some precomputation to only return a subset of walls here.
		for (const wall of this.walls) {
			for (let i = 0; i <= wall.length - 4; i += 2) {
				yield [ wall[i], wall[i+1], wall[i+2], wall[i+3] ];
			}
		}
	}

	static distance = (x1, y1, x2, y2) => {
		const dx = x2 - x1
		const dy = y2 - y1
		return Math.sqrt(dx * dx + dy * dy);
	};

	static maximalDX = (dy, distance) => {
		return Math.sqrt(distance * distance - dy * dy);
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

	#clearVisibility = (entity) => {
		const x = entity.x + entity.w / 2;
		const y = entity.y + entity.h / 2;
		const r = entity.visionRange;
		const deletionBitmask = ~(1 << entity.visionId);

		this.#forEachWithinRange(x, y, r, (i, j) => {
			this.visionMap[j * this.width + i] &= deletionBitmask;
		});
	};

	static SAFETY_MARGIN = 0.05;

	// Do the line segments (a, b)--(c, d) and (e, f)--(g, h) intersect for the purposes of looking or moving through walls?
	// We don't want players squeezing in between or looking through the intersection of two wall segments, so this function errs on the side of caution by a safety margin of Game.SAFETY_MARGIN.
	static intersect = (a, b, c, d, e, f, g, h) => {
		// We are solving the vector equation
		// alpha * (a, b)^T + (1 - alpha) * (c, d) = beta * (e, f) + (1 - beta) * (g, h). 
		// for alpha and beta.
		// If the determinant is !== 0, the two the two infinite lines extending the two line segments have an intersection. alpha specifies the location of that intersection  on (a, b)--(c, d), with values of 0 and 1 corresponding to the endpoints. Similarly, beta specifies the location on (e, f)--(g, h).
		const determinant = (a - c) * (f - h) - (e - g) * (b - d);
		if (determinant === 0) {
			return false; // Movement or vision parallel to a wall is allowed.
		}

		const v = (f - h) * (g - c) + (g - e) * (h - d);
		const w = - ((d - b) * (g - c) + (a - c) * (h - d));
		const alpha = v / determinant;
		const beta = w / determinant;

		// Theoretically, the two line segments intersect iff alpha and beta are in the interval [0, 1] (i. e. the line's intersection lies within both line segments). However, we want to allow for an absolute error of Game.SAFETY_MARGIN. To make it absolute, we have to account or the line segment's lengths. If labcd is the the length of (a, b)--(c, d), we want
		// -Game.SAFETY_MARGIN <= alpha * labcd <= labcd + Game.SAFETY_MARGIN.
		// and analogously for beta.
		// There are certainly ways to simplify these checks for better performance. (avoid sqrt, ensure only integer parameters and arithmetic, ..), but let's not optimize prematurely.
		const labcd = Math.sqrt((a - c) * (a - c) + (b - d) * (b - d));
		const lefgh = Math.sqrt((e - g) * (e - g) + (f - h) * (f - h));

		return (-Game.SAFETY_MARGIN <= alpha * labcd)
			&& (alpha * labcd <= labcd + Game.SAFETY_MARGIN)
			&& (-Game.SAFETY_MARGIN <= beta * lefgh)
			&& (beta * lefgh <= lefgh + Game.SAFETY_MARGIN);
	};

	// Checks whether (e, f)--(g, h) intersects any wall.
	// r is an optional parameter used to optimize the function by only checking for relevantWallSegments(e, f, r).
	#intersectsAnyWall = (e, f, g, h, r) => {
		for (const [a, b, c, d] of this.#relevantWallSegments(e, f, r)) {
			if (Game.intersect(a, b, c, d, e, f, g, h)) {
				return false;
			}
		}
		return true;
	}

	#forEachWithinRange = (x, y, r, callback) => {
		// (i, j) are the coordinates of the upper left corner of the square that they refer to (in e. g. this.#visionMap). So (i + 0.5, j + 0.5) is the square's center, which we care about for distance checking.
		// Since j is an integer, minY <= j + 0.5 is equivalent Math.ceil(minY - 0.5) <= j, and j + 0.5 <= maxY equivalent to j <= Math.floor(maxY - 0.5). Same for i and x.

		const minY = Math.max(y - r, 0);
		const maxY = Math.min(y + r, this.height);
		const minJ = Math.ceil(minY - 0.5);
		const maxJ = Math.floor(maxY - 0.5);

		for (let j = minJ; j <= maxJ; j++) {
			const maxDX = Game.maximalDX(j + 0.5 - y, r);
			const minX = Math.max(x - maxDX, 0);
			const maxX = Math.min(x + maxDX, this.width);
			const minI = Math.ceil(minX - 0.5);
			const maxI = Math.floor(maxX - 0.5);
			for (let i = minI; i <= maxI; i++) {
				callback(i, j);
			}
		}
	}

	#addVisibility = (entity) => {
		const x = entity.x + entity.w / 2;
		const y = entity.y + entity.h / 2;
		const r = entity.visionRange;
		const addBitmask = Game.SEEN_BEFORE | (1 << entity.visionId);

		this.#forEachWithinRange(x, y, r, (i, j) => {
			const visible = this.#intersectsAnyWall(x, y, i + 0.5, j + 0.5);
			if (visible) {
				this.visionMap[j * this.width + i] |= addBitmask;
			}
		})
	};
};

globalThis.Game = Game