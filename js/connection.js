window.addEventListener( 'load', establishConnection );

let signalingServer = null,
	peerConnection = null,
	dataChannel = null;

function establishConnection(){

	console.log( 'establishing new connection to the server' );

	signalingServer = new WebSocket('ws://localhost:3000');

	const signalingServerStatusDisplay = document.getElementById('signalingServerStatus');

	signalingServer.addEventListener( 'error', (event) => {
		console.warn( 'signalingServer: error connecting to the server' );
		signalingServerStatusDisplay.textContent = 'error';
	});

	signalingServer.addEventListener( 'open', (event) => {
		console.log( 'signalingServer: connection to the server established' );
		signalingServerStatusDisplay.textContent = 'connected';

		startPeerConnection();
	});

	signalingServer.addEventListener( 'close', (event) => {
		console.log( 'signalingServer: connection to the server closed' );
		signalingServerStatusDisplay.textContent = 'closed';
	});

	signalingServer.addEventListener( 'message', async (message) => {
		if( message.data instanceof Blob ) {
			// Convert Blob to text
			message.data.text().then((text) => {
				console.log('signalingServer: message received (blob)');
				processSignalingServerMessage(text);
			});
		} else {
			console.log('signalingServer: message received (plain)');
			processSignalingServerMessage(message.data);
		}
	});

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

		document.getElementById('signalingStateStatus').textContent = peerConnection.signalingState;

	});
	peerConnection.addEventListener( 'icecandidate', (event) => {
		console.log('peerConnection: icecandidate');
		if( ! event.candidate ) return;
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
	peerConnection.addEventListener( 'icecandidateerror', (event) => {
		console.warn('peerConnection: icecandidateerror', event);
	});
	peerConnection.addEventListener( 'iceconnectionstatechange', (event) => {
		console.log('peerConnection: iceconnectionstatechange', event);
		console.log('  peerConnection iceConnectionState', peerConnection.iceConnectionState);
		document.getElementById('iceConnectionStatus').textContent = peerConnection.iceConnectionState;
	});
	peerConnection.addEventListener( 'icegatheringstatechange', (event) => {
		console.info('peerConnection: icegatheringstatechange', event);
	});
	peerConnection.addEventListener( 'negotiationneeded', (event) => {
		console.warn('peerConnection: negotiationneeded', event);
	});


	const localDataChannelStatusDisplay = document.getElementById('localDataChannelStatus');

	// Create the data channel for sending messages
	dataChannel = peerConnection.createDataChannel( 'image-push' );
	dataChannel.addEventListener( 'open', (event) => {
		console.log( 'local data channel open' );
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
		console.log('local data channel closed');
		localDataChannelStatusDisplay.textContent = 'closed';
	});


	// Create an offer if this is the first client
	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	signalingServer.send(JSON.stringify({ offer }));

}

function processSignalingServerMessage(message) {

	console.log('  process signalingServer message', message)

	const parsedData = JSON.parse(message);

	if( parsedData.offer ) {
		console.log( '    message is an offer', parsedData.offer );
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.offer))
			.then(() => peerConnection.createAnswer())
			.then(answer => peerConnection.setLocalDescription(answer))
			.then(() => signalingServer.send(JSON.stringify({ answer: peerConnection.localDescription })));
	} else if( parsedData.answer ) {
		console.log( '    message is an answer', parsedData.answer );
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.answer));
	} else if( parsedData.candidate ) {
		console.log( '    message is a candidate' );
		peerConnection.addIceCandidate(new RTCIceCandidate(parsedData.candidate));
	}
}
