window.onload = init;

function init() {
  renderNav();
  initListeners();
  initMqtt();
  initKeyboardControls();

  initGrid('controlsLayout');
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
      display.innerHTML = `Time: 30ms`;
    }
    else if (device === 'servo') {
      let display = document.getElementById(`${device}-${node}-${func}-val`);
      if (func === 'speed')
        display.innerHTML = `spd: 8192`;
      else if (func === 'center')
        display.innerHTML = `ctr: 32768`;
    }
    input.addEventListener('input', function() {
      [device, node, func] = input.id.split('-'); // func may be undefined
      if (device === 'light') {
        let display = document.getElementById(device+'-'+node+'-val');
        display.innerHTML = `Power: ${this.value}`;
      }
      else if (device === 'exposure') {
        let display = document.getElementById(device+'-'+node+'-val');
        display.innerHTML = `Time: ${this.value}ms`;
        if (self.cameraMap.hasOwnProperty(node)) {
          let port = self.cameraMap[node].port;
        }
        else
          console.warn(`missing cameraMap at ${this.id}! Cannot control this device`);
      }
      else if (device === 'servo') {
        let display = document.getElementById(`${device}-${node}-${func}-val`);
        if (func === 'speed')
          display.innerHTML = `spd: ${this.value}`;
        else if (func === 'center')
          display.innerHTML = `ctr: ${this.value}`;
      }
    }, false);
    input.addEventListener('change', function() {
      [device, node, func] = input.id.split('-'); // func may be undefined
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
        if (func === 'speed')
          display.innerHTML = `spd: ${this.value}`;
        else if (func === 'center')
          display.innerHTML = `ctr: ${this.value}`;
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
      else if (device === 'gripper' || device === 'waterSampler' || device === 'trim') {
        if (val === 'open') {
          sendGripper(node, '2');
        }
        else if (val === 'close') {
          sendGripper(node, '3');
        }
        else if (val === 'stop') {
          sendGripper(node, '0');
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

function sendCamera (func, port, value) {
  let topic = 'toCamera/' + port + '/' + func;
  mqttWorker.port.postMessage({topic: topic, payload: value});
  console.debug('sendCamera', topic, value);
};
function sendServo (func, nodeId, value) {
  let topic = 'servo/' + nodeId + '/' + func;
  mqttWorker.port.postMessage({topic: topic, payload: value});
};
function sendGripper (nodeId, value) {
  let topic = 'grippers/' + nodeId;
  mqttWorker.port.postMessage({topic: topic, payload: value});
};
function sendLight (nodeId, value) {
  let topic = 'light/' + nodeId;
  mqttWorker.port.postMessage({topic: topic, payload: value});
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
