
const sendButton = document.getElementById('sendButton');
sendButton.onclick = () => {
	if( ! dataChannel || dataChannel.readyState !== "open" ) return;

	dataChannel.send("Hello World");
};
