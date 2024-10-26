
const port = 3000;

const WebSocket = require('ws');
const server = new WebSocket.Server({ port: port });
let clients = [];

server.on('connection', (socket) => {

	console.log( 'new connection' );
	clients.push(socket);
	console.log( '  now having', clients.length, 'clients' );

	socket.on('message', (message) => {
		//console.log('new message with a length of', message.length);
		clients.forEach((client) => {

			if( client === socket ) return;
			if( client.readyState !== WebSocket.OPEN ) return;

			client.send(message);

		});
	});

	socket.on('close', () => {
		console.log('connection closed');
		clients = clients.filter((client) => client !== socket);
		console.log( '  now having', clients.length, 'clients' );
	});

});

console.log("WebSocket signaling server running on ws://localhost:"+port);
