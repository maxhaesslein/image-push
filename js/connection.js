window.addEventListener( 'load', function(){

	establishConnection();

	var reconnectButton = document.getElementById('reconnect');
	reconnectButton.addEventListener( 'click', () => {
		reConnect();
	});

});

let signalingServer = null,
	peerConnection = null,
	dataChannel = null;

function reConnect() {
	
	console.warn('force reconnect');

	if( signalingServer ) {
		console.log('  closing connection to server' );
		signalingServer.close();
		signalingServer = null;
	}

	establishConnection();
}

function establishConnection(){

	console.log( 'establishing new connection to the server' );

	signalingServer = new WebSocket('ws://localhost:3000');

	const connectionStatus = document.getElementById('connectionstatus');

	signalingServer.addEventListener( 'error', (event) => {
		console.warn( 'error connecting to the server' );
		connectionStatus.textContent = 'connection failed';
	});

	signalingServer.addEventListener( 'open', (event) => {
		console.info( 'connection to the server established' );
		connectionStatus.textContent = 'connection established';

		startPeerConnection();
	});

	signalingServer.addEventListener( 'close', (event) => {
		connectionStatus.textContent = 'connection closed';
		console.info( 'connection to the server closed' );
	});

	signalingServer.onmessage = async (message) => {

		if (message.data instanceof Blob) {
			// Convert Blob to text
			message.data.text().then((text) => {
				processMessage(text);
			});
		} else {
			processMessage(message.data);
		}

	};

}

async function startPeerConnection(){

	peerConnection = new RTCPeerConnection();

	peerConnection.addEventListener( 'connectionstatechange', (event) => {
		console.log( 'peerConnection state change', event );

		var statusDisplay = document.getElementById('peerconnectionstatus');

		switch( peerConnection.connectionState ) {
			case "new":
			case "connecting":
				statusDisplay.textContent = "Peer Connection: Connecting …";
			break;
			case "connected":
				statusDisplay.textContent = "Peer Connection: Online";
			break;
			case "disconnected":
				statusDisplay.textContent = "Peer Connection: Disconnecting …";
			break;
			case "closed":
				statusDisplay.textContent = "Peer Connection: Offline";
			break;
			case "failed":
				statusDisplay.textContent = "Peer Connection: Error";
				console.warn( 'startPeerConnection() - error establishing a peer connection', event );
			break;
			default:
				statusDisplay.textContent = "Peer Connection: Unknown";
			break;
		}

	});
	peerConnection.addEventListener( 'icecandidate', (event) => {
		// ICE candidate handling
		if( ! event.candidate ) return;
		
		console.log('ICE candidate handling', event);

		signalingServer.send( JSON.stringify({ candidate: event.candidate }) );
	});
	peerConnection.addEventListener( 'datachannel', (event) => {
		// Listening for the remote data channel
		event.channel.addEventListener( 'message', (e) => {
			console.log( 'Received message:', e.data );
			handleServerMessage(e.data);
		});
	});

	const dataChannelStatus = document.getElementById('datachannelstatus');

	// Create the data channel for sending messages
	dataChannel = peerConnection.createDataChannel( 'image-push' );
	dataChannel.addEventListener( 'open', (event) => {
		console.info( 'data channel open' );
		dataChannelStatus.textContent = 'data channel opened';
	});
	dataChannel.addEventListener( 'message', (event) => {
		console.log( 'data channel received message:', event.data );
	});
	dataChannel.addEventListener( 'error', (event) => {
		console.warn( 'data channel error', event );
	});
	dataChannel.addEventListener( 'closing', (event) => {
		console.log('data channel closing …');
		dataChannelStatus.textContent = 'data channel closing …';
	});
	dataChannel.addEventListener( 'close', (event) => {
		console.info('data channel closed');
		dataChannelStatus.textContent = 'data channel closed';
	});


	// Create an offer if this is the first client
	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	signalingServer.send(JSON.stringify({ offer }));

}


function isJSON(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

function processMessage(data) {
	console.log( 'processMessage() - received message:', data );

	if (!isJSON(data)) {
		console.warn( 'Non-JSON message received:', data );
		return;
	}

	const parsedData = JSON.parse(data);

	if (parsedData.offer) {
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.offer))
			.then(() => peerConnection.createAnswer())
			.then(answer => peerConnection.setLocalDescription(answer))
			.then(() => signalingServer.send(JSON.stringify({ answer: peerConnection.localDescription })));
	} else if (parsedData.answer) {
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.answer));
	} else if (parsedData.candidate) {
		peerConnection.addIceCandidate(new RTCIceCandidate(parsedData.candidate));
	}
}
