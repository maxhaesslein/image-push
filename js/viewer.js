
function handleRemoteDataChannel( event ){

	const remoteDataChannel = event.channel;

	const remoteDataChannelStatusDisplay = document.getElementById( 'dataChannelStatus' );

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

}



function addDataChannel(){
	dataChannel = peerConnection.createDataChannel( 'image-push' );
}
