export default class Game {
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
}