
const viewerId = 'viewer-'+Date.now().toString(36) + Math.random().toString(36).substr(2);
document.getElementById('viewerIdStatus').textContent = viewerId;


let webSocketAddress = 'ws://localhost:3000'; // fallback
if( Options ) {
	webSocketAddress = Options['host']+':'+Options['port'];
}


window.addEventListener( 'load', webSocketSetup );

let webSocketConnection = null,
	peerConnection = null,
	dataChannel = null,
	reconnectTimer = null;

function removeImage(){
	handleMessage('{"type":"clear","title":"- nothing -"}');
}

function reconnect(){

	removeImage();

	const reconnectTimeout = 2; // in seconds

	if( reconnectTimer ) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	console.log('trying to reconnect in', reconnectTimeout, 'seconds');

	reconnectTimer = setTimeout(() => {
		console.info('reconnecting ...');
		// TODO: re-establish all necessary connections
		startPeerConnection();
	}, reconnectTimeout*1000 );

}


function webSocketSetup(){

	console.info( 'WebSocket setup' );

	webSocketConnection = new WebSocket(webSocketAddress);

	const webSocketStatusDisplay = document.getElementById('webSocketStatus');

	webSocketConnection.addEventListener( 'error', (event) => {
		console.warn( 'WebSocket: error connecting to the server' );
		webSocketStatusDisplay.textContent = 'error';
		// TOOD: re-establish websocket connection
	});

	webSocketConnection.addEventListener( 'open', (event) => {
		console.log( 'WebSocket: connection to the server established' );
		webSocketStatusDisplay.textContent = 'connected';

		peerConnectionSetup();
	});

	webSocketConnection.addEventListener( 'close', (event) => {
		console.log( 'WebSocket: connection to the server closed' );
		webSocketStatusDisplay.textContent = 'closed';
		// TOOD: re-establish websocket connection
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
				reconnect();
			break;
			case "closed":
				peerConnectionStatusDisplay.textContent = "closed";
				reconnect();
			break;
			case "failed":
				peerConnectionStatusDisplay.textContent = "error";
				console.warn( 'startPeerConnection() - error establishing a peer connection', event );
				reconnect();
			break;
			default:
				peerConnectionStatusDisplay.textContent = "unknown";
				reconnect();
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
		reconnect();
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
			console.log( 'remote data channel received a message' );
			handleMessage( e.data );
		});
		remoteDataChannel.addEventListener( 'error', (e) => {
			console.warn( 'remote data channel error', e.data );
			dataChannelStatusDisplay.textContent = 'error';
			reconnect();
		});
		remoteDataChannel.addEventListener( 'closing', (e) => {
			console.log( 'remote data channel closing' );
			dataChannelStatusDisplay.textContent = 'closing …';
			reconnect();
		});
		remoteDataChannel.addEventListener( 'close', (e) => {
			console.log( 'remote data channel closed' );
			dataChannelStatusDisplay.textContent = 'closed';
			reconnect();
		});

	});

	startPeerConnection();

}

function startPeerConnection(){

	webSocketConnection.send( JSON.stringify({
		type: 'new',
		viewerId: viewerId
	}));

}


function handleMessage( message ) {

	message = JSON.parse(message);

	const viewZone = document.getElementById('view-zone'),
		contentArea = viewZone.querySelector('#view-zone-content'),
		noContentMessage = viewZone.querySelector('#no-content');

	contentArea.innerHTML = '';

	if( message.type == 'clear' ) {

		noContentMessage.classList.remove('hidden');

	} else if( message.type == 'image' ) {

		noContentMessage.classList.add('hidden');

		const image = document.createElement('img');
		image.addEventListener('load', () => {
			contentArea.appendChild(image);
		});
		image.src = message.data;


	} else {
		console.warn('unknown message type', message.type);
		console.log(message);
		return;
	}

}
