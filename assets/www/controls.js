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
  let device, node, val;
  let self = this;  // outer scope
  const inputs = document.getElementsByTagName('input');
  const buttons = document.getElementsByTagName('button');

  inputsList = Array.prototype.slice.call(inputs);
  inputsList.forEach(function(input, idx) {
    // set initial innerHTML
    [device, node, func] = input.id.split('-');  // func may be undefined
    if (device === 'light') {
      let display = document.getElementById(device+'-'+node+'-val');
      display.innerHTML = `Power: 0.0`;
    }
    else if (device === 'exposure') {
      let display = document.getElementById(device+'-'+node+'-val');
      display.innerHTML = `Time: 100ms`;
    }
    else if (device === 'servo') {
      let display = document.getElementById(`${device}-${node}-${func}-val`);
      if (func === 'speed')
        display.innerHTML = `${func}: 8192`;
      else if (func === 'center')
        display.innerHTML = `${func}: 32768`;
    }
    input.addEventListener('change', function() {
      [device, node, func] = input.id.split('-'); // func may be undefined
      console.debug('event ', input.id, 'val ', this.value);
      if (device === 'light') {
        let display = document.getElementById(device+'-'+node+'-val');
        display.innerHTML = `Power: ${this.value}`;
        sendLight(node, this.value);
      }
      else if (device === 'exposure') {
        let display = document.getElementById(device+'-'+node+'-val');
        display.innerHTML = `Time: ${this.value}ms`;
        if (self.cameraMap.hasOwnProperty(node)) {
          let port = self.cameraMap[node].port;
          sendCamera(device, port, this.value);
        }
        else
          console.warn(`missing cameraMap at ${this.id}! Cannot control this device`);
      }
      else if (device === 'servo') {
        let display = document.getElementById(`${device}-${node}-${func}-val`);
        display.innerHTML = `${func}: ${this.value}`;
        sendServo(func, node, this.value);
      }
    }, false);
  });

  buttonsList = Array.prototype.slice.call(buttons);
  buttonsList.forEach(function(button, idx) {
    button.addEventListener('click', function() {
      console.log('clicked ', this.id);
      [device, node, val] = this.id.split('-');
      if (device === 'servo') {
        let center = parseInt(document.getElementById(`${device}-${node}-center`).value);
        let speed = parseInt(document.getElementById(`${device}-${node}-speed`).value);
        if (val === 'pos') {
          sendServo('move', node, (center+speed).toString());
        }
        else if (val === 'neg') {
          sendServo('move', node, (center-speed).toString());
        }
      }
      else if (device === 'gripper' || device === 'sampler' || device === 'trim') {
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
          sendCamera(device, port, val);
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
      mqttClient.subscribe('telemetry/update');
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
        this.cameraMap[id].record = val[4];
        window.localStorage.setItem('cameraMap', JSON.stringify(this.cameraMap));
      }
      // make sure it is still valid
      else {
        if (this.cameraMap[id].ts !== val[3]) {
          this.cameraMap[id].port = val[0];
          this.cameraMap[id].ts = val[3];
          this.cameraMap[id].record = val[4];
          window.localStorage.setItem('cameraMap', JSON.stringify(this.cameraMap));
        }
      }
      let statusNode = document.getElementById(`video-${id}-record`);
      if (statusNode) {
        if (this.cameraMap[id].record == true) {
          statusNode.classList.remove('dot-inactive');
          statusNode.classList.add('dot-active');
        }
        else {
          statusNode.classList.remove('dot-active');
          statusNode.classList.add('dot-inactive');
        }
      }
    }
    else if (topic.match('telemetry/update') !== null) {
      let obj = JSON.parse(payload);
      for (let prop in obj) {
        // update text and slider or button
        if (prop.match('light\.[0-9]+\.currentPower') !== null) {
          [device, node, func] = prop.split('.');
          let display = document.getElementById(`${device}-${node}-val`);
          if (display !== null) {
            display.innerHTML = `Power: ${obj[prop]}`;
          }
          display = document.getElementById(`${device}-${node}`);
          if (display !== null) {
            display.value = obj[prop];
          }
        }
        else if (prop.match('servo\.[0-9]+\.') !== null) {
          [device, node, func] = prop.split('.');
          let display = document.getElementById(`${device}-${node}-${func}-val`);
          if (display !== null) {
            display.innerHTML = `${func}: ${obj[prop]}`;
          }
          display = document.getElementById(`${device}-${node}-${func}`);
          if (display !== null) {
            display.value = obj[prop];
          }
        }
        else if (prop.match('camera\.[0-9]+\.') !== null) {
          [device, node, func] = prop.split('.');
          if (func !== 'exposure') {
            let display = document.getElementById(`${func}-${node}-${obj[prop]}`);
            if (display !== null) {
              let items = document.getElementsByClassName(`${func}-${node}`);
              for (let i in items.length) {
                items[i].classList.remove('dot-current');
              }
              display.classList.add('dot-current');
            }
          }
          else {
            let display = document.getElementById(`${func}-${node}`);
            if (display !== null) {
              display.value = parseInt(obj[prop]);
            }
            display = document.getElementById(`${func}-${node}-val`);
            if (display !== null) {
              display.innerHTML = `${func}: ${obj[prop]}`;
            }
          }
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
function sendServo (func, nodeId, value) {
  let topic = 'servo/' + nodeId + '/' + func;
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
