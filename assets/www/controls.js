function init() {
  initListeners();
  initMqtt();
  initKeyboardControls();

  initGrid('controlsLayout');
}

function initListeners() {
  let func, node, val;
  const inputs = document.getElementsByTagName('input');
  const buttons = document.getElementsByTagName('button');

  inputsList = Array.prototype.slice.call(inputs);
  inputsList.forEach(function(input, idx) {
    input.addEventListener('change', function() {
      console.log('slid ', this.id, 'val ', this.value);
      [func, node] = this.id.split('-');
      if (func === 'light') {
        let display = document.getElementById(func+node+'Val');
        display.innerHTML = this.value;
        sendLight(node, this.value);
      }
    }, false);
  });

  buttonsList = Array.prototype.slice.call(buttons);
  buttonsList.forEach(function(button, idx) {
    button.addEventListener('click', function() {
      console.log('clicked ', this.id);
      [func, node, val] = this.id.split('-');
      if (func === 'servo') {
        if (val === 'pos') {
          sendServo(node, '1');
        }
        else if (val === 'neg') {
          sendServo(node, '-1');
        }
      }
      else if (func === 'exposure') {
        if (val === 'pos') {
          sendCamera(func, node, '1');
        }
        else if (val === 'neg') {
          sendCamera(func, node, '-1');
        }
      }
      else {
        sendCamera(func, node, val);
      }
    }, false);
  });
}

function initMqtt() {
  var mqttClient = mqtt.connect('ws://' + window.location.hostname + ':3000');
  window['mqttClient'] = mqttClient;  // yeah...
  mqttClient.on('connect', function (connack) {
    if (connack) {
      console.log('MQTT connected to broker');
    }
  });
  mqttClient.on('offline', function () {
    console.log('MQTT client offline');
  });
  mqttClient.on('reconnect', function (topic, payload) {
    console.log('MQTT client reconnected');
  });
  mqttClient.on('error', function (error) {
    console.error('MQTT client error: ', error);
  });
  mqttClient.on('message', (topic, payload) => {
  });
}

function sendCamera (func, port, value) {
  let topic = 'toCamera/' + window.location.port + '/' + func;
  mqttClient.publish(topic, value);
};
function sendServo (nodeId, value) {
  let topic = 'servo/' + nodeId;
  mqttClient.publish(topic, value);
};
function sendLight (nodeId, value) {
  let topic = 'light/' + nodeId;
  mqttClient.publish(topic, value);
};

function initKeyboardControls() {
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