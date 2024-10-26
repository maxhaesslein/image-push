function addDataChannel(){

	const dataChannelStatusDisplay = document.getElementById('dataChannelStatus');

	// Create the data channel for sending messages
	dataChannel = peerConnection.createDataChannel( 'image-push' );
	dataChannel.addEventListener( 'open', (event) => {
		console.info( 'local data channel open' );
		dataChannelStatusDisplay.textContent = 'opened';
	});
	dataChannel.addEventListener( 'message', (event) => {
		console.log( 'local data channel received message:', event.data );
	});
	dataChannel.addEventListener( 'error', (event) => {
		console.warn( 'local data channel error', event );
		dataChannelStatusDisplay.textContent = 'error';
	});
	dataChannel.addEventListener( 'closing', (event) => {
		console.log('local data channel closing …');
		dataChannelStatusDisplay.textContent = 'closing …';
	});
	dataChannel.addEventListener( 'close', (event) => {
		console.info('local data channel closed');
		dataChannelStatusDisplay.textContent = 'closed';
	});

}

const sendButton = document.getElementById('sendButton');
sendButton.onclick = () => {
	if( ! dataChannel || dataChannel.readyState !== "open" ) return;

	dataChannel.send("Hello World");
};



function handleRemoteDataChannel() {

	remoteDataChannel = event.channel;

	remoteDataChannel.addEventListener( 'open', (e) => {
		console.log( 'remote data channel opened' );
	});
	remoteDataChannel.addEventListener( 'message', (e) => {
		console.log( 'remote data channel received a message:', e.data );
	});
	remoteDataChannel.addEventListener( 'error', (e) => {
		console.warn( 'remote data channel error', e.data );
	});
	remoteDataChannel.addEventListener( 'closing', (e) => {
		console.log( 'remote data channel closing' );
	});
	remoteDataChannel.addEventListener( 'close', (e) => {
		console.log( 'remote data channel closed' );
	});

}
