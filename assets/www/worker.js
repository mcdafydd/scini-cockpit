let self = this;
let canvas, ctx, ws;

importScripts('reconnecting-websocket-iife.min.js');

self.addEventListener('message', function(e) {
  if (e.data.hasOwnProperty('canvas')) {
    canvas = e.data.canvas;
    ctx = canvas.getContext('2d');
  }
  else if (e.data.hasOwnProperty('hostname')) {
    const wsUri = 'ws://' + e.data.hostname + ':' + e.data.wsPort;
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
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      })
    };
    ws.onerror = function (e) {
    };
  }
}, false);
