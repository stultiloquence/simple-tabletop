import { EventEmitter } from './util.js';
import Game, { commandsEqual } from './game.js';

export default class SyncedGame extends EventEmitter {

	ws;

	acknowledgedGame;
	speculativeGame;

	commandsSinceLastACKQueue = [];

	constructor () {
		super();
		
		this.speculativeGame.on("entity moved", (e) => {
			this.emit("speculative game entity moved", e);
		});

		this.ws = new WebSocket("ws://localhost:8080/");

		this.ws.addEventListener("message", (e) => {
			const data = JSON.parse(e.data);

			switch (data.type) {
			case "initialize":
				this.acknowledgedGame = new Game(data);
				this.speculativeGame = new Game(data);
				this.emit("initialized");
				break;
			case "command":
				this.acknowledgedGame.applyCommand(data);
				const first = this.commandsSinceLastACKQueue[0];
				if (!first) {
					// We have no unacknowledged local command, so we just apply the other command to the speculativeGame as well. This is equivalent to this.speculativeGame.resetGameTo(this.acknowledgedGame). I don't know which is faster.
					this.speculativeGame.applyCommand(data);
				} else if (commandsEqual(first, data)) {
					// Our locally applied command got acknowledged, no one else interfered.
					this.commandsSinceLastACKQueue.shift();
				} else {
					// Someone interfered when we wanted to do our command.
					console.log("Got command", data, "different from own command", first, ", have to reset game state.");
					this.speculativeGame.resetGameStateTo(this.acknowledgedGame);
					this.commandsSinceLastACKQueue = [];
					this.emit("speculative game reset");
				}
				break;
			default:
				console.log("Warning: Don't recognize the message", data);
				break;
			}
		});
	}

	applyCommand = (command) => {
		this.speculativeGame.applyCommand(command);
		this.commandsSinceLastACKQueue.push(command);
		this.ws.send({
			type: "command",
			...command,
		});
	}

}