window.onload = init;
let worker;
let workerPath = 'worker.js';

function init() {
  var self = this;
  renderNav();
  initWorker();
  initListeners();
  initKeyboardControls();
  initMqtt();

  SilentAudio();

  // Feature detect.
  document.querySelector('.support').classList.toggle(
    'notsupported', !('OffscreenCanvas' in window));
}

function SilentAudio(audioCtx) {
  audioCtx = audioCtx || new AudioContext()
  var source = audioCtx.createConstantSource()
  var gainNode = audioCtx.createGain()
  gainNode.gain.value = 0.001 // required to prevent popping on start
  source.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  source.start()
}

function initWorker() {
  const offscreen = document.querySelector('canvas').transferControlToOffscreen();
  if (document.location.pathname.match('video-gl') !== null)
    workerPath = 'worker-gl.js';
  worker = new Worker(workerPath);
  worker.onerror = function (e) {
    console.error(`Worker error: ${e}`);
  }
  worker.onmessage = function(e) {
    // hack to support black screen when switching cameras in webGl page
    if (e.data.hasOwnProperty('command')) {
      console.log(`Received worker command = ${e.data.command}`);
      if (e.data.command === 'hide') {
        document.querySelector('canvas').classList.add('support');
      }
      else if (e.data.command === 'show') {
        document.querySelector('canvas').classList.remove('support');
      }
    }
  }

  worker.postMessage({ canvas: offscreen }, [offscreen]);

  self.lastCamera = window.localStorage.getItem('lastCamera');
  if (self.lastCamera === null ) {
    self.lastCamera = '215';
  }

  let port;
  if (self.cameraMap.hasOwnProperty(self.lastCamera)) {
    port = self.cameraMap[self.lastCamera].port-100;
  }
  else {
    port = window.location.port-100;
  }
  worker.postMessage({
    hostname: window.location.hostname,
    wsPort: port
  });

  // handle window close
  window.onbeforeunload = function() {
    worker.postMessage({
      command: 'close'
    });
  };
}

function initListeners() {
  const elem = document.getElementById('video-select');
  if (elem !== null) {
    elem.value = `video-${self.lastCamera}`;
    elem.addEventListener('change', function() {
      console.log('Selected camera ', this.value);
      let id = this.value.split('-')[1];
      window.localStorage.setItem('lastCamera', id);
      // close old websocket connection
      worker.postMessage({
        command: 'close'
      });
      // inform websocket worker to get new camera stream
      worker.postMessage({
        hostname: window.location.hostname,
        wsPort: self.cameraMap[id].port-100
      });
    }, false);
  }
}

function initKeyboardControls() {

  // bind controls
  Mousetrap.bind('shift+1', function (e) {
    sendCamera('resolution', '1');
  });
  Mousetrap.bind('shift+2', function (e) {
    sendCamera('resolution', '2');
  });
  Mousetrap.bind('shift+4', function (e) {
    sendCamera('resolution', '4');
  });
  Mousetrap.bind('shift+7', function (e) {
    sendCamera('quality', '80');
  });
  Mousetrap.bind('shift+8', function (e) {
    sendCamera('quality', '85');
  });
  Mousetrap.bind('shift+9', function (e) {
    sendCamera('quality', '92');
  });
  Mousetrap.bind('shift+0', function (e) {
    sendCamera('quality', '100');
  });
  Mousetrap.bind(['=', '+'], function (e) {
    sendCamera('exposure', '1');
  });
  Mousetrap.bind(['-', '_'], function (e) {
    sendCamera('exposure', '-1');
  });
  Mousetrap.bind('space', function (e) {
    sendCamera('snapFull', '1');
  });
}

function sendCamera (func, value) {
  let port = self.cameraMap[self.lastCamera].port;
  let topic = 'toCamera/' + port + '/' + func;
  mqttWorker.port.postMessage({topic: topic, payload: value});
  console.debug('sendCamera', topic, value);
};
