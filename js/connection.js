window.addEventListener( 'load', establishConnection );

let signalingServer = null,
	peerConnection = null,
	dataChannel = null;

function shutdown() {

	if( dataChannel ) {
		console.log( '  closing data channel' );
		dataChannel = null;
	}

	if( peerConnection ) {
		console.log('  closing peer connection' );
		document.getElementById('peerConnectionStatus').textContent = 'closed';
		peerConnection.close();
		peerConnection = null;
	}

	if( signalingServer ) {
		console.log('  closing connection to server' );
		signalingServer.close();
		signalingServer = null;
	}

}

function establishConnection(){

	console.log( 'establishing new connection to the server' );

	signalingServer = new WebSocket('ws://localhost:3000');

	const signalingServerStatusDisplay = document.getElementById('signalingServerStatus');

	signalingServer.addEventListener( 'error', (event) => {
		console.warn( 'signalingServer: error connecting to the server' );
		signalingServerStatusDisplay.textContent = 'error';
	});

	signalingServer.addEventListener( 'open', (event) => {
		console.info( 'signalingServer: connection to the server established' );
		signalingServerStatusDisplay.textContent = 'connected';

		startPeerConnection();
	});

	signalingServer.addEventListener( 'close', (event) => {
		console.info( 'signalingServer: connection to the server closed' );
		signalingServerStatusDisplay.textContent = 'closed';
		shutdown();
	});

	signalingServer.onmessage = async (message) => {

		if( message.data instanceof Blob ) {
			// Convert Blob to text
			message.data.text().then((text) => {
				processSignalingServerMessage(text);
			});
		} else {
			processSignalingServerMessage(message.data);
		}

	};

}

async function startPeerConnection(){

	peerConnection = new RTCPeerConnection();

	peerConnection.addEventListener( 'connectionstatechange', (event) => {

		const peerConnectionStatusDisplay = document.getElementById('peerConnectionStatus');

		switch( peerConnection.connectionState ) {
			case "new":
			case "connecting":
				peerConnectionStatusDisplay.textContent = "connecting …";
			break;
			case "connected":
				peerConnectionStatusDisplay.textContent = "connected";
			break;
			case "disconnected":
				peerConnectionStatusDisplay.textContent = "disconnected";
			break;
			case "closed":
				peerConnectionStatusDisplay.textContent = "closed";
			break;
			case "failed":
				peerConnectionStatusDisplay.textContent = "error";
				console.warn( 'startPeerConnection() - error establishing a peer connection', event );
			break;
			default:
				peerConnectionStatusDisplay.textContent = "unknown";
			break;
		}

	});
	peerConnection.addEventListener( 'icecandidate', (event) => {
		if( ! event.candidate ) return;
		
		console.log('ICE candidate handling');

		signalingServer.send( JSON.stringify({ candidate: event.candidate }) );
	});
	peerConnection.addEventListener( 'datachannel', (event) => {
		
		const remoteDataChannel = event.channel;

		const remoteDataChannelStatusDisplay = document.getElementById( 'remoteDataChannelStatus' );

		remoteDataChannel.addEventListener( 'open', (e) => {
			console.log( 'remote data channel opened' );
			remoteDataChannelStatusDisplay.textContent = 'opened';
		});
		remoteDataChannel.addEventListener( 'message', (e) => {
			console.log( 'remote data channel received a message:', e.data );
			document.getElementById('messages').value += e.data+"\n";
		});
		remoteDataChannel.addEventListener( 'error', (e) => {
			console.warn( 'remote data channel error', e.data );
			remoteDataChannelStatusDisplay.textContent = 'error';
		});
		remoteDataChannel.addEventListener( 'closing', (e) => {
			console.log( 'remote data channel closing' );
			remoteDataChannelStatusDisplay.textContent = 'closing …';
		});
		remoteDataChannel.addEventListener( 'close', (e) => {
			console.log( 'remote data channel closed' );
			remoteDataChannelStatusDisplay.textContent = 'closed';
		});

	});


	const localDataChannelStatusDisplay = document.getElementById('localDataChannelStatus');

	// Create the data channel for sending messages
	dataChannel = peerConnection.createDataChannel( 'image-push' );
	dataChannel.addEventListener( 'open', (event) => {
		console.info( 'local data channel open' );
		localDataChannelStatusDisplay.textContent = 'opened';
	});
	dataChannel.addEventListener( 'message', (event) => {
		console.log( 'local data channel received message:', event.data );
	});
	dataChannel.addEventListener( 'error', (event) => {
		console.warn( 'local data channel error', event );
		localDataChannelStatusDisplay.textContent = 'error';
	});
	dataChannel.addEventListener( 'closing', (event) => {
		console.log('local data channel closing …');
		localDataChannelStatusDisplay.textContent = 'closing …';
	});
	dataChannel.addEventListener( 'close', (event) => {
		console.info('local data channel closed');
		localDataChannelStatusDisplay.textContent = 'closed';
	});


	// Create an offer if this is the first client
	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	signalingServer.send(JSON.stringify({ offer }));

}

function processSignalingServerMessage(data) {

	console.log( 'processSignalingServerMessage() - received message' );

	const parsedData = JSON.parse(data);

	if( parsedData.offer ) {
		console.log( '  message is an offer' );
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.offer))
			.then(() => peerConnection.createAnswer())
			.then(answer => peerConnection.setLocalDescription(answer))
			.then(() => signalingServer.send(JSON.stringify({ answer: peerConnection.localDescription })));
	} else if( parsedData.answer ) {
		console.log( '  message is an answer' );
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.answer));
	} else if( parsedData.candidate ) {
		console.log( '  message is a candidate' );
		peerConnection.addIceCandidate(new RTCIceCandidate(parsedData.candidate));
	}
}
