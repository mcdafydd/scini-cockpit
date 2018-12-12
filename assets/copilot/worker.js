let self = this;
let canvas, ctx, ws, reopen;

importScripts('reconnecting-websocket-iife.min.js');

self.addEventListener('message', function(e) {
  if (e.data.hasOwnProperty('canvas')) {
    canvas = e.data.canvas;
    ctx = canvas.getContext('2d');
  }
  else if (e.data.hasOwnProperty('hostname')
           && e.data.hasOwnProperty('wsPort')) {
    // give user indication of change in camera
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fill();
    let wsUri = `ws://${e.data.hostname}:${e.data.wsPort}`;
    if (ws instanceof ReconnectingWebSocket) {
        ws.close();
    }
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
    };
    ws.onerror = function (e) {
    };
  }
}, false);
