Drag images into a browser window to view them remotely

work in progress.

# Setup

create a new file called `options.js` in the root-directory of this project with the following content:

```js

const Options = {
	port: 3000,
	host: 'ws://localhost',
};

if( typeof module !== 'undefined' ) module.exports = Options;

```

update port and address as needed.

cd into the `server/` subfolder and install the dependencies via:

```bash
npm install
```

# Server

cd into the `server/` subfolder, then start the server via:

```bash
node server.js
```

# Client

- first, open the `presenter.html` in a browser window
- then open the `viewer.html` in one or more other browsers windows
- drag&drop images into the `presenter` window
- click a thumbnail to send this image to all the `viewers`
