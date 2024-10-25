window.addEventListener( 'load', function(){
	establishConnection();
});

let signalingServer = null,
	peerConnection = null,
	dataChannel = null;

function establishConnection(){
	signalingServer = new WebSocket('ws://localhost:3000');

	const connectionStatus = document.getElementById('connectionstatus');

	signalingServer.addEventListener( 'error', (event) => {
		console.warn('error connecting to the server');

		connectionStatus.textContent = 'connection failed';
	});

	signalingServer.addEventListener( 'open', (event) => {
		console.info('connection to the server established');

		connectionStatus.textContent = 'connection established';

		startPeerConnection();
	});

	signalingServer.addEventListener( 'close', (event) => {
		connectionStatus.textContent = 'connection closed';
		console.info('connection to the server closed');
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

	const dataChannelStatus = document.getElementById('datachannelstatus');

	// Create the data channel for sending messages
	dataChannel = peerConnection.createDataChannel("chat");
	dataChannel.onopen = () => {
		console.log("Data channel open");
		dataChannelStatus.textContent = 'data channel open';
	}
	dataChannel.onmessage = (event) => {
		console.log("Received message:", event.data);
	}

	// ICE candidate handling
	peerConnection.onicecandidate = (event) => {
		if (event.candidate) {
			signalingServer.send(JSON.stringify({ candidate: event.candidate }));
		}
	};

	// Listening for the remote data channel
	peerConnection.ondatachannel = (event) => {
		event.channel.onmessage = (e) => {
			console.log("Received message:", e.data);
			handleServerMessage(e.data);
		}
	};

	// Create an offer if this is the first client
	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	signalingServer.send(JSON.stringify({ offer }));

}


// Helper function to check if a message is valid JSON
function isJSON(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

function processMessage(data) {
	console.log("Received message:", data);

	if (!isJSON(data)) {
		console.warn("Non-JSON message received:", data);
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
