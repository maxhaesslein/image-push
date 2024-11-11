
let webSocketConnection = null,
	peerConnections = {};

const peerConnectionsDisplay = document.getElementById('peerConnections');



window.addEventListener( 'load', webSocketSetup );

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

	const viewerId = parsedData.viewerId;

	if( parsedData.type == 'new' ) {
		console.log('  message is a new viewer', viewerId );
		newPeerConnection( viewerId );
	} else if( parsedData.type == 'answer' ) {
		console.log( '    message is an answer for', viewerId );
		peerConnections[viewerId].connection.setRemoteDescription(new RTCSessionDescription(parsedData.answer));
	} else if( parsedData.type == 'candidate' ) {
		console.log( '    message is a candidate for', viewerId );
		peerConnections[viewerId].connection.addIceCandidate(new RTCIceCandidate(parsedData.candidate));
	}
}


function newPeerConnection( viewerId ) {

	console.log('creating new peer connection for',viewerId);

	const display = document.createElement('ul');
	display.style.display = 'inline-block';
	display.id = viewerId;

	const idDisplay = document.createElement('li');
	idDisplay.textContent = 'viewerId: '+viewerId;
	display.appendChild(idDisplay);

	const peerConnectionDisplay = document.createElement('li');
	peerConnectionDisplay.textContent = 'PeerConnection: …';
	peerConnectionDisplay.classList.add('peerConnectionDisplay');
	display.appendChild(peerConnectionDisplay);

	const iceConnectionDisplay = document.createElement('li');
	iceConnectionDisplay.textContent = 'ICEConnection: …';
	iceConnectionDisplay.classList.add('iceConnectionDisplay');
	display.appendChild(iceConnectionDisplay);

	const dataChannelDisplay = document.createElement('li');
	dataChannelDisplay.textContent = 'DataChannel: …';
	dataChannelDisplay.classList.add('dataChannelDisplay');
	display.appendChild(dataChannelDisplay);

	const screenDisplay = document.createElement('li');
	screenDisplay.textContent = 'Showing: - nothing -';
	screenDisplay.classList.add('screenDisplay');
	display.appendChild(screenDisplay);


	peerConnectionsDisplay.appendChild(display);

	peerConnections[viewerId] = {
		viewerId: viewerId,
		connection: null,
		dataChannel: null,
		display: display
	};

	peerConnectionSetup(viewerId);

}


function removePeerConnection( viewerId ) {

	console.log('removing peer connection for', viewerId);

	peerConnections[viewerId].connection.close();

	peerConnectionsDisplay.querySelector('#'+viewerId).remove();

	delete peerConnections[viewerId];

}


async function peerConnectionSetup( viewerId ){

	console.info( 'PeerConnection setup' );

	peerConnections[viewerId].connection = new RTCPeerConnection();

	peerConnections[viewerId].connection.addEventListener( 'connectionstatechange', (event) => {

		const peerConnectionStatusDisplay = peerConnections[viewerId].display.querySelector('.peerConnectionDisplay');

		switch( peerConnections[viewerId].connection.connectionState ) {
			case "new":
			case "connecting":
				peerConnectionStatusDisplay.textContent = "PeerConnection: connecting …";
			break;
			case "connected":
				peerConnectionStatusDisplay.textContent = "PeerConnection: connected";
			break;
			case "disconnected":
				peerConnectionStatusDisplay.textContent = "PeerConnection: disconnected";
				removePeerConnection(viewerId);
			break;
			case "closed":
				peerConnectionStatusDisplay.textContent = "PeerConnection: closed";
				removePeerConnection(viewerId);
			break;
			case "failed":
				peerConnectionStatusDisplay.textContent = "PeerConnection: error";
				console.warn( 'startPeerConnection() - error establishing a peer connection', event );
			break;
			default:
				peerConnectionStatusDisplay.textContent = "PeerConnection: unknown";
			break;
		}

	});

	peerConnections[viewerId].connection.addEventListener( 'icecandidate', (event) => {
		console.log('PeerConnection: icecandidate');
		if( ! event.candidate ) return;
		webSocketConnection.send( JSON.stringify({
			viewerId: viewerId,
			type: 'candidate',
			candidate: event.candidate
		}) );
	});

	peerConnections[viewerId].connection.addEventListener( 'icecandidateerror', (event) => {
		console.warn('PeerConnection: icecandidateerror', event);
	});

	peerConnections[viewerId].connection.addEventListener( 'iceconnectionstatechange', (event) => {
		console.log('PeerConnection: iceconnectionstatechange', event);
		console.log('  peerConnection iceConnectionState', peerConnections[viewerId].connection.iceConnectionState);
		peerConnections[viewerId].display.querySelector('.iceConnectionDisplay').textContent = 'ICEConnection: '+peerConnections[viewerId].connection.iceConnectionState;
	});

	peerConnections[viewerId].connection.addEventListener( 'icegatheringstatechange', (event) => {
		console.log('PeerConnection: icegatheringstatechange', event);
	});

	peerConnections[viewerId].connection.addEventListener( 'negotiationneeded', (event) => {
		console.warn('PeerConnection: negotiationneeded', event);
	});


	// Create the data channel for sending messages
	const dataChannelStatusDisplay = peerConnections[viewerId].display.querySelector('.dataChannelDisplay');
	peerConnections[viewerId].dataChannel = peerConnections[viewerId].connection.createDataChannel( 'image-push' );
	peerConnections[viewerId].dataChannel.addEventListener( 'open', (event) => {
		console.log( 'local data channel open' );
		dataChannelStatusDisplay.textContent = 'DataChannel: opened';
	});
	peerConnections[viewerId].dataChannel.addEventListener( 'message', (event) => {
		console.log( 'local data channel received message:', event.data );
	});
	peerConnections[viewerId].dataChannel.addEventListener( 'error', (event) => {
		console.warn( 'local data channel error', event );
		dataChannelStatusDisplay.textContent = 'DataChannel: error';
	});
	peerConnections[viewerId].dataChannel.addEventListener( 'closing', (event) => {
		console.log('local data channel closing …');
		dataChannelStatusDisplay.textContent = 'DataChannel: closing …';
	});
	peerConnections[viewerId].dataChannel.addEventListener( 'close', (event) => {
		console.log('local data channel closed');
		dataChannelStatusDisplay.textContent = 'DataChannel: closed';
	});

	const offer = await peerConnections[viewerId].connection.createOffer();
	await peerConnections[viewerId].connection.setLocalDescription(offer);
	webSocketConnection.send(JSON.stringify({
		viewerId: viewerId,
		type: 'offer',
		offer: offer
	}));

}



var Gallery = {

	container: false,

	setup: () => {

		Gallery.container = document.getElementById('gallery');

		if( ! Gallery.container ) return;

		const area = document.getElementById('drop-area');

		if( ! area ) return;

		window.addEventListener( 'dragover', (e) => {
			area.classList.add('active');
			e.preventDefault();
		});
		window.addEventListener( 'mouseout', (e) => {
			area.classList.remove('active');
		});
		area.addEventListener( 'mouseout', (e) => {
			area.classList.remove('active');
		});

		window.addEventListener( 'drop', (e) => {
			
			e.preventDefault();

			if( e.dataTransfer.items ) {

				// Use DataTransferItemList interface to access the file(s)
				[...e.dataTransfer.items].forEach((item, i) => {

					if( item.kind !== 'file') return;

					const file = item.getAsFile();
					Gallery.drop(file);

				});

			} else {

				// Use DataTransfer interface to access the file(s)
				[...e.dataTransfer.files].forEach((file, i) => {
					Gallery.drop(file);
				});

			}

		});

		document.getElementById('selected-element-none').addEventListener( 'click', Gallery.updateRemoteImage );

	},

	drop: ( file ) => {

		if( ! file.type.startsWith("image/") ) return;

		const container = document.createElement('li');

		const id = 'image-'+Date.now().toString(36) + Math.random().toString(36).substr(2);
		container.id = id;

		const label = document.createElement('label');

		const img = document.createElement("img");
		img.file = file;
		label.appendChild(img);

		const title = document.createElement('span');
		title.classList.add('element-title');
		title.textContent = file.name;		
		label.appendChild(title);
		const viewButton = document.createElement('input');
		viewButton.type = 'radio';
		viewButton.name = 'selected-element';
		viewButton.value = id;
		viewButton.addEventListener( 'click', Gallery.updateRemoteImage );
		label.appendChild(viewButton);

		container.appendChild(label);		

		const removeButton = document.createElement('button');
		removeButton.textContent = 'remove';
		removeButton.dataset.id = id;
		removeButton.addEventListener( 'click', Gallery.removeImage );
		container.appendChild(removeButton);
		
		Gallery.container.appendChild(container);


		const reader = new FileReader();
		reader.onload = (e) => {
			img.src = e.target.result;
		};
		reader.readAsDataURL(file);


	},

	removeImage: (e) => {

		const button = e.target,
			id = button.dataset.id;

		const element = Gallery.container.querySelector('#'+id);

		if( ! element ) {
			console.warn('cannot remove element from gallery, element not found', id);
			return;
		}

		if( element.querySelector('input[type="radio"]:checked') ) {
			document.getElementById('selected-element-none').checked = true;
			Gallery.updateRemoteImage();
		}

		element.remove();

	},

	updateRemoteImage: (e) => {

		const activeRadioElement = Gallery.container.querySelector('input[type="radio"]:checked');

		if( ! activeRadioElement ) return;

		const value = activeRadioElement.value;

		if( value == 'no-image' ) {
			sendMessage({
				type: 'clear',
				title: '- nothing -'
			});
			return;
		}

		var item = activeRadioElement.closest('label');

		const imageId = value;

		const image = item.querySelector('img');
		const title = item.querySelector('span.element-title').textContent;

		sendMessage({
			type: 'image',
			id: imageId,
			title: title,
			data: image.src
		});

	}

};
window.addEventListener( 'load', Gallery.setup );


function sendMessage( message ) {

	for( const [viewerId, viewer] of Object.entries(peerConnections) ) {

		console.log('sending message to', viewerId);

		dataChannel = viewer.dataChannel;

		if( ! dataChannel || dataChannel.readyState !== "open" ) continue;

		dataChannel.send(JSON.stringify(message));

		let title = '??';
		if( message.title ) {
			title = message.title;
		}
		
		viewer.display.querySelector('.screenDisplay').textContent = 'showing: '+title;

	}

}

