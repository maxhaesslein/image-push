
const webSocketAddress = 'ws://localhost:3000';
const viewerId = 'viewer-'+Date.now().toString(36) + Math.random().toString(36).substr(2);
document.getElementById('viewerIdStatus').textContent = viewerId;


window.addEventListener( 'load', webSocketSetup );

let webSocketConnection = null,
	peerConnection = null,
	dataChannel = null;


function webSocketSetup(){

	console.info( 'WebSocket setup' );

	webSocketConnection = new WebSocket(webSocketAddress);

	const webSocketStatusDisplay = document.getElementById('webSocketStatus');

	webSocketConnection.addEventListener( 'error', (event) => {
		console.warn( 'WebSocket: error connecting to the server' );
		webSocketStatusDisplay.textContent = 'error';
	});

	webSocketConnection.addEventListener( 'open', (event) => {
		console.log( 'WebSocket: connection to the server established' );
		webSocketStatusDisplay.textContent = 'connected';

		peerConnectionSetup();
	});

	webSocketConnection.addEventListener( 'close', (event) => {
		console.log( 'WebSocket: connection to the server closed' );
		webSocketStatusDisplay.textContent = 'closed';
	});

	webSocketConnection.addEventListener( 'message', async (message) => {
		if( message.data instanceof Blob ) {
			// Convert Blob to text
			message.data.text().then((text) => {
				console.log('WebSocket: message received (blob)');
				webSocketProcessMessage(text);
			});
		} else {
			console.log('WebSocket: message received (plain)');
			webSocketProcessMessage(message.data);
		}
	});

}

function webSocketProcessMessage(message) {

	console.log('  process WebSocket message', message)

	const parsedData = JSON.parse(message);

	if( ! parsedData.viewerId ) {
		console.warn('message without viewerId!', parsedData );
		return;
	}

	const targetViewerId = parsedData.viewerId;

	if( targetViewerId != viewerId ) {
		return;
	}

	if( parsedData.type == 'offer' ) {
		console.log( '    message is an offer', parsedData.offer );
		peerConnection.setRemoteDescription(new RTCSessionDescription(parsedData.offer))
			.then(() => peerConnection.createAnswer())
			.then(answer => peerConnection.setLocalDescription(answer))
			.then(() => webSocketConnection.send(JSON.stringify({
				type: 'answer',
				viewerId: viewerId,
				answer: peerConnection.localDescription
			})));
	} else if( parsedData.type == 'candidate' ) {
		console.log( '    message is a candidate' );
		peerConnection.addIceCandidate(new RTCIceCandidate(parsedData.candidate));
	}
}

async function peerConnectionSetup(){

	console.info( 'PeerConnection setup' );

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
		console.log('PeerConnection: icecandidate');
		if( ! event.candidate ) return;
		webSocketConnection.send( JSON.stringify({
			type: 'candidate',
			viewerId: viewerId,
			candidate: event.candidate
		}) );
	});

	peerConnection.addEventListener( 'icecandidateerror', (event) => {
		console.warn('PeerConnection: icecandidateerror', event);
	});

	peerConnection.addEventListener( 'iceconnectionstatechange', (event) => {
		console.log('PeerConnection: iceconnectionstatechange', event);
		console.log('  peerConnection iceConnectionState', peerConnection.iceConnectionState);
		document.getElementById('iceConnectionStatus').textContent = peerConnection.iceConnectionState;
	});

	peerConnection.addEventListener( 'icegatheringstatechange', (event) => {
		console.log('PeerConnection: icegatheringstatechange', event);
	});

	peerConnection.addEventListener( 'negotiationneeded', (event) => {
		console.warn('PeerConnection: negotiationneeded', event);
	});

	peerConnection.addEventListener( 'datachannel', (event) => {
		
		const remoteDataChannel = event.channel;

		const dataChannelStatusDisplay = document.getElementById( 'dataChannelStatus' );

		remoteDataChannel.addEventListener( 'open', (e) => {
			console.log( 'remote data channel opened' );
			dataChannelStatusDisplay.textContent = 'opened';
		});
		remoteDataChannel.addEventListener( 'message', (e) => {
			console.log( 'remote data channel received a message:', e.data );
			document.getElementById('messages').value += e.data+"\n";
		});
		remoteDataChannel.addEventListener( 'error', (e) => {
			console.warn( 'remote data channel error', e.data );
			dataChannelStatusDisplay.textContent = 'error';
		});
		remoteDataChannel.addEventListener( 'closing', (e) => {
			console.log( 'remote data channel closing' );
			dataChannelStatusDisplay.textContent = 'closing …';
		});
		remoteDataChannel.addEventListener( 'close', (e) => {
			console.log( 'remote data channel closed' );
			dataChannelStatusDisplay.textContent = 'closed';
		});

	});

	webSocketConnection.send( JSON.stringify({
		type: 'new',
		viewerId: viewerId
	}));

}

