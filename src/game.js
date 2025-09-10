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
	}

	moveSelected = (dx, dy) => {
		const actor = this.selectedEntity;
		if (!actor) {
			return;
		}

		const oldX = actor.x;
		const oldY = actor.y;

		actor.x = clamp(0, this.width, actor.x + dx);
		actor.y = clamp(0, this.height, actor.y + dy);

		if (oldX !== actor.x || oldY !== actor.y) {
			this.#updateVisibility(actor.visionId, oldX, oldY, actor.x, actor.y, actor.visionRange);

			this.fire("entity moved", {
				entity: actor,
				oldX: oldX,
				oldY: oldY,
			});
		}
	};
	moveUp = () => { this.moveSelected(0, -1); };
	moveDown = () => { this.moveSelected(0, 1); };
	moveLeft = () => { this.moveSelected(-1, 0); };
	moveRight = () => { this.moveSelected(1, 0); };

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
				if (i === x - r && j === y) {
					console.log(this.visionMap[j * this.width + i]);
				}
				this.visionMap[j * this.width + i] &= deletionBitmask;

				if (i === x - r && j === y) {
					console.log(this.visionMap[j * this.width + i]);
				}
			}
		}
	};

	static EPSILON = 0.0001; // We allow players to see points that are exactly collinear with a corner.
	// Do the line segments (a, b)--(c, d) and (e, f)--(g, h) intersect?
	static intersect = (a, b, c, d, e, f, g, h) => {
		const determinant = (a - c) * (f - h) - (e - g) * (b - d);
		if (determinant === 0) {
			return false; // This is a design decision. If the line of sight is identical to the wall, we say the player can see alongside it on both sides.
		}

		const v = (f - h) * (g - c) + (g - e) * (h - d);
		const w = - ((d - b) * (g - c) + (a - c) * (h - d));
		return (-Game.EPSILON <= v / determinant)
			&& (v / determinant <= 1 + Game.EPSILON)
			&& (-Game.EPSILON <= w / determinant)
			&& (w / determinant <= 1 + Game.EPSILON);
	};

	#addVisibility = (id, x, y, r) => {
		const addBitmask = Game.SEEN_BEFORE | (1 << id);

		for (let i = Math.max(x - r, 0); i <= Math.min(x + r, this.width - 1); i++) {
			const maxY = Game.maximalY(Math.abs(i - x), r);
			for (let j = Math.max(y - maxY, 0); j <= Math.min(y + maxY, this.height - 1); j++) {
				let visible = true;
				for (const [a, b, c, d] of this.#relevantWallSegments(x, y, r)) {
					// We add 0.5 to the x and y values because we say a square is visible from another square if the line connecting their centers does not intersect any walls.
					if (Game.intersect(a, b, c, d, x + 0.5, y + 0.5, i + 0.5, j + 0.5)) {
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