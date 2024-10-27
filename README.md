Drag images into a browser window to view them remotely

work in progress.

# Server

cd into the `server/` subfolder

on the first run, install the dependencies via:

```bash
npm install
```

then start the server via:

```bash
node server.js
```

# Client

- first, open the `presenter.html` in a browser window
- then open the `viewer.html` in one or more other browsers windows
- drag&drop images into the `presenter` window
- click a thumbnail to send this image to all the `viewers`
