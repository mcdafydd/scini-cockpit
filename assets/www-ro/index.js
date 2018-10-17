function init() {
  // Feature detect.
  document.querySelector('.support').classList.toggle(
    'notsupported', !('OffscreenCanvas' in window));

  initMqtt();

  var doVisualUpdates = true;
  document.addEventListener('visibilitychange', function(){
    doVisualUpdates = !document.hidden;
  });

  const offscreen = document.querySelector('canvas').transferControlToOffscreen();
  const worker = new Worker('/worker.js');
  worker.addEventListener('error', function (e) {
    console.error('Worker error: ', e);
  }, false);
  worker.postMessage({ canvas: offscreen }, [offscreen]);
  worker.postMessage({
    hostname: window.location.hostname,
    wsPort: window.location.port-100
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