window.onload = init;
let worker;

function init() {
  renderNav();
  initListeners();
  initMqtt();
  initKeyboardControls();

  // Feature detect.
  document.querySelector('.support').classList.toggle(
    'notsupported', !('OffscreenCanvas' in window));

  const offscreen = document.querySelector('canvas').transferControlToOffscreen();
  worker = new Worker('worker-gl.js');
  worker.addEventListener('error', function (e) {
    console.error('Worker error: ', e);
  }, false);
  worker.postMessage({ canvas: offscreen }, [offscreen]);
  worker.postMessage({
    hostname: window.location.hostname,
    wsPort: window.location.port === "" ? 8104 : window.location.port-100
  });
}

function SilentAudio(audioCtx) {
  var self = this;
  //if (!(self instanceof SilentAudio)) return new SilentAudio(audioCtx)

  audioCtx = audioCtx || new AudioContext()
  var source = audioCtx.createConstantSource()
  var gainNode = audioCtx.createGain()
  gainNode.gain.value = 0.001 // required to prevent popping on start
  source.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  source.start()
}

function initListeners() {
  this.lastCamera = window.localStorage.getItem('lastCamera');
  if (this.lastCamera === null )
    this.lastCamera = '215';

  const elem = document.getElementById('video-select');
  if (elem !== null) {
    elem.value = `video-${this.lastCamera}`;
    elem.addEventListener('change', function() {
      console.log('Selected camera ', elem.value);
      let id = elem.value.split('-')[1];
      window.localStorage.setItem('lastCamera', id);
      // inform websocket worker to get new camera stream
      worker.postMessage({
        hostname: window.location.hostname,
        wsPort: this.cameraMap[id].port-100
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
  let port = this.cameraMap[this.lastCamera].port;
  let topic = 'toCamera/' + port + '/' + func;
  mqttWorker.port.postMessage({topic: topic, payload: value});
  console.debug('sendCamera', topic, value);
};
