
const port = 3000;

const WebSocket = require('ws');
const server = new WebSocket.Server({ port: port });
let clients = [];

server.on('connection', (socket) => {

	console.log('new connection');

	clients.push(socket);

	socket.on('message', (message) => {
		console.log('new message');
		clients.forEach((client) => {
			if (client !== socket && client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		});
	});

	socket.on('close', () => {
		console.log('connection closed');
		clients = clients.filter((client) => client !== socket);
	});
});

console.log("WebSocket signaling server running on ws://localhost:"+port);
