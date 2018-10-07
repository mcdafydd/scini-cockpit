let self = this;
let canvas, ctx, ws;

self.addEventListener('message', function(e) {
  if (e.data.hasOwnProperty('canvas')) {
    canvas = e.data.canvas;
    ctx = canvas.getContext('2d');
  }
  else if (e.data.hasOwnProperty('hostname')) {
    const wsUri = 'ws://' + e.data.hostname + ':' + e.data.wsPort;
    ws = new WebSocket(wsUri);
    ws.onopen = function () {
      console.log("mjpg-streamer websocket connected");
    };
    ws.onclose = function () {
      console.log("mjpg-streamer websocket disconnected");
    };
    ws.onmessage = function (e) {
      createImageBitmap(e.data)
      .then(img => {
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      })
      //canvas.width = img.width;
      //canvas.height = img.height;
    };
    ws.onerror = function (e) {
      console.log('websocket error: ' + e.data);
      ws.close();
    };
  }
}, false);