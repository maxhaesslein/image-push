function handleServerMessage( data ) {

	console.warn('received message from the server', data);

}

const sendButton = document.getElementById('sendButton');
sendButton.onclick = () => {
	if (dataChannel && dataChannel.readyState === "open") {
		dataChannel.send("Hello, World");
	}
};
