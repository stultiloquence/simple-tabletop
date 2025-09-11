import Game from "./game.js";
import View from "./view.js"
import Control from "./control.js"

const canvas = document.getElementById('view');
const resize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;	
}
resize();

const game = new Game();
const view = new View(game, canvas);
const control = new Control(game, view, canvas);

window.addEventListener('resize', () => {
	resize();
	view.render();
});

// For the purposes of debugging:

window.Game = Game;
window.View = View;
window.Control = Control;
window.game = game;
window.view = view;
window.control = control;