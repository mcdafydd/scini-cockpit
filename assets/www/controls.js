function init() {
  initMqtt();

  // bind keyboard controls
  Mousetrap.bind('shift+1', function(e) {
    sendCamera('resolution', '1');
  });
  Mousetrap.bind('shift+2', function(e) {
    sendCamera('resolution', '2');
  });
  Mousetrap.bind('shift+4', function(e) {
    sendCamera('resolution', '4');
  });
  Mousetrap.bind('shift+7', function(e) {
    sendCamera('quality', '70');
  });
  Mousetrap.bind('shift+8', function(e) {
    sendCamera('quality', '80');
  });
  Mousetrap.bind('shift+9', function(e) {
    sendCamera('quality', '90');
  });
  Mousetrap.bind('shift+0', function(e) {
    sendCamera('quality', '100');
  });
  Mousetrap.bind(['=', '+'], function(e) {
    sendCamera('exposure', '1');
  });
  Mousetrap.bind(['-', '_'], function(e) {
    sendCamera('exposure', '-1');
  });
  Mousetrap.bind('space', function(e) {
    sendCamera('snapFull', '1');
  });
}

function initMqtt() {
  var client = mqtt.connect('ws://' + window.location.hostname + ':3000');
  client.on('connect', function (connack) {
    client.subscribe('telemetry/update', function (e) {
      if (!e) {
        console.log('Subscribed to MQTT telemetry/update');
      }
    });
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
  client.on('message', (topic, payload) => {
  });
}

function sendCamera (func, port, value) {
  let topic = 'toCamera/' + window.location.port + '/' + func;
  client.publish(topic, value);
};
function sendServo (nodeId, value) {
  let topic = 'toServo/' + nodeId;
  client.publish(topic, value);
};
