function init() {
  initListeners();
  initMqtt();
  initKeyboardControls();

  initGrid('controlsLayout');

  let obj = window.localStorage.getItem('cameraMap');
  if (obj === null)
    this.cameraMap = {};
  else
    this.cameraMap = JSON.parse(obj);
}

function initListeners() {
  let func, node, val;
  let self = this;  // outer scope
  const inputs = document.getElementsByTagName('input');
  const buttons = document.getElementsByTagName('button');

  inputsList = Array.prototype.slice.call(inputs);
  inputsList.forEach(function(input, idx) {
    // set initial innerHTML
    [func, node] = input.id.split('-');
    if (func === 'light') {
      let display = document.getElementById(func+'-'+node+'-val');
      display.innerHTML = `Power: 0.0`;
    }
    else if (func === 'exposure') {
      let display = document.getElementById(func+'-'+node+'-val');
      display.innerHTML = `Time: 100ms`;
    }
    input.addEventListener('change', function() {
      [func, node] = input.id.split('-');
      console.debug('event ', func, 'node ', node, 'val ', this.value);
      if (func === 'light') {
        let display = document.getElementById(func+'-'+node+'-val');
        display.innerHTML = `Power: ${this.value}`;
        sendLight(node, self.value);
      }
      else if (func === 'exposure') {
        let display = document.getElementById(func+'-'+node+'-val');
        display.innerHTML = `Time: ${this.value}ms`;
        if (self.cameraMap.hasOwnProperty(node)) {
          let port = self.cameraMap[node].port;
          sendCamera(func, port, this.value);
        }
        else
          console.warn(`missing cameraMap at ${this.id}! Cannot control this device`);
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
      else if (func === 'gripper' || func === 'sampler' || func === 'trim') {
        if (val === 'open') {
          sendGripper(node, '2');
        }
        else if (val === 'close') {
          sendGripper(node, '3');
        }
      }
      else {
        if (self.cameraMap.hasOwnProperty(node)) {
          let port = self.cameraMap[node].port;
          sendCamera(func, port, val);
        }
        else
          console.warn(`missing cameraMap at ${this.id}!  Cannot control this device`);
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
      mqttClient.subscribe('toCamera/cameraRegistration');
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
    if (topic.match('toCamera/cameraRegistration') !== null) {
      let val = payload.toString().split(':');
      let id = val[1].split('.')[3];  // last IP address octet
      if (!this.cameraMap.hasOwnProperty(id)) {
        this.cameraMap[id] = {};
        this.cameraMap[id].port = val[0];
        this.cameraMap[id].ts = val[3];
        window.localStorage.setItem('cameraMap', JSON.stringify(this.cameraMap));
      }
      // make sure it is still valid
      else {
        if (this.cameraMap[id].ts !== val[3]) {
          this.cameraMap[id].port = val[0];
          this.cameraMap[id].ts = val[3];
          window.localStorage.setItem('cameraMap', JSON.stringify(this.cameraMap));
        }
      }
    }
  });
}

function sendCamera (func, port, value) {
  let topic = 'toCamera/' + port + '/' + func;
  mqttClient.publish(topic, value);
  console.debug('sendCamera', topic, value);
};
function sendServo (nodeId, value) {
  let topic = 'servo/' + nodeId;
  mqttClient.publish(topic, value);
};
function sendGripper (nodeId, value) {
  let topic = 'grippers/' + nodeId;
  mqttClient.publish(topic, value);
};
function sendLight (nodeId, value) {
  let topic = 'light/' + nodeId;
  mqttClient.publish(topic, value);
};

function initKeyboardControls() {
  // bind keyboard controls
  Mousetrap.bind(['=', '+'], function(e) {
    sendCamera('exposure', window.location.port, '1');
  });
  Mousetrap.bind(['-', '_'], function(e) {
    sendCamera('exposure', window.location.port, '-1');
  });
  Mousetrap.bind('space', function(e) {
    sendCamera('snapFull', window.location.port, '1');
  });
}
