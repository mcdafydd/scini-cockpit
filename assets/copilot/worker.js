let self = this;
let canvas, ctx, ws, reopen;

importScripts('reconnecting-websocket-iife.min.js');

self.addEventListener('message', function(e) {
  if (e.data.hasOwnProperty('canvas')) {
    canvas = e.data.canvas;
    ctx = canvas.getContext('2d');
  }
  else if (e.data.hasOwnProperty('command')) {
    if (e.data.command === 'close' && ws instanceof ReconnectingWebSocket) {
      // disable handlers and close any open websocket connections
      ws.onmessage = function () {};
      ws.close();
    }
  }
  else if (e.data.hasOwnProperty('hostname') &&
             e.data.hasOwnProperty('wsPort')) {

    // give user indication of change in camera
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fill();
    let wsUri = `ws://${e.data.hostname}:${e.data.wsPort}`;

    // Ref: https://github.com/pladaria/reconnecting-websocket
    ws = new ReconnectingWebSocket(wsUri);
    ws.onopen = function () {
      console.log("mjpg-streamer websocket connected");
    };
    ws.onclose = function () {
      console.log("mjpg-streamer websocket disconnected");
    };
    ws.onmessage = function (e) {
      createImageBitmap(e.data)
      .then(img => {
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      })
      .catch(err => {
        console.log(`Worker createImageBitmap() error: ${err}`);
      });
    };
    ws.onerror = function (e) {
      console.error(`mjpg-streamer websocket error: ${e}`);
    };
  }
}, false);
