import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3000 });

wss.on("connection", (ws) => {
	console.log("Connected!");

	ws.addEventListener("message", (e) => {
		console.log("received:", e);
		console.log(e.data);
		ws.send(e.data);
	});

	ws.send("HELLO");
});