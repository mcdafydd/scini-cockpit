function init() {
  // Feature detect.
  document.querySelector('.support').classList.toggle(
    'notsupported', !('OffscreenCanvas' in window));

  initKeyboardControls();
  initMqtt();

  var doVisualUpdates = true;
  document.addEventListener('visibilitychange', function(){
    doVisualUpdates = !document.hidden;
  });

  const offscreen = document.querySelector('canvas').transferControlToOffscreen();
  const worker = new Worker('/worker-gl.js');
  worker.addEventListener('error', function (e) {
    console.error('Worker error: ', e);
  }, false);
  worker.postMessage({ canvas: offscreen }, [offscreen]);
  worker.postMessage({
    hostname: window.location.hostname,
    wsPort: window.location.port-100
  });
}

function initKeyboardControls() {

  // bind controls
  Mousetrap.bind('shift+1', function (e) {
    sendCommand('resolution', '1');
  });
  Mousetrap.bind('shift+2', function (e) {
    sendCommand('resolution', '2');
  });
  Mousetrap.bind('shift+4', function (e) {
    sendCommand('resolution', '4');
  });
  Mousetrap.bind('shift+7', function (e) {
    sendCommand('quality', '80');
  });
  Mousetrap.bind('shift+8', function (e) {
    sendCommand('quality', '85');
  });
  Mousetrap.bind('shift+9', function (e) {
    sendCommand('quality', '92');
  });
  Mousetrap.bind('shift+0', function (e) {
    sendCommand('quality', '100');
  });
  Mousetrap.bind(['=', '+'], function (e) {
    sendCommand('exposure', '1');
  });
  Mousetrap.bind(['-', '_'], function (e) {
    sendCommand('exposure', '-1');
  });
  Mousetrap.bind('space', function (e) {
    sendCommand('snapFull', '1');
  });
}

function initMqtt() {
  const client = mqtt.connect('ws://' + window.location.hostname + ':3000');
  client.on('connect', function (connack) {
    console.log('Connected to MQTT broker');
  });
  client.on('offline', function () {
    console.log('MQTT client offline');
  });
  client.on('reconnect', function (topic, payload) {
    console.log('MQTT client reconnected');
  });
  client.on('error', function (error) {
    console.error('MQTT client error: ', error);
  });
}
