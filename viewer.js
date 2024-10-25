function handleServerMessage( data ) {

	console.log('handleServerMessage', data)

	document.getElementById('messages').value += data+"\n";

}
