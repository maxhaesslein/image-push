window.addEventListener( 'load', function(){
	establishConnection();
});

let signalingServer = null,
	peerConnection = null,
	dataChannel = null;

function establishConnection(){
	signalingServer = new WebSocket('ws://localhost:3000');

	signalingServer.addEventListener( 'error', (event) => {
		console.warn('error connecting to the server')
	});

	signalingServer.addEventListener( 'open', (event) => {
		console.info('connection to the server established')
	});

	signalingServer.addEventListener( 'close', (event) => {
		console.info('connection to the server closed')
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

const startButton = document.getElementById('startButton');
startButton.onclick = async () => {
	peerConnection = new RTCPeerConnection();

	// Create the data channel for sending messages
	dataChannel = peerConnection.createDataChannel("chat");
	dataChannel.onopen = () => console.log("Data channel open");
	dataChannel.onmessage = (event) => console.log("Received message:", event.data);

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
			document.getElementById('messages').value += e.data+"\n";
		}
	};

	// Create an offer if this is the first client
	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	signalingServer.send(JSON.stringify({ offer }));
};

const sendButton = document.getElementById('sendButton');
sendButton.onclick = () => {
	if (dataChannel && dataChannel.readyState === "open") {
		dataChannel.send("Hello, World");
	}
};
