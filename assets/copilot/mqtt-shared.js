var mqttWorker, swCh;

let obj = window.localStorage.getItem('cameraMap');
  if (obj === null)
    this.cameraMap = {};
  else
    this.cameraMap = JSON.parse(obj);

function initMqtt() {
  mqttWorker = new SharedWorker('worker-mqtt.js');
  swCh = new BroadcastChannel('swCh');

  mqttWorker.port.start();
  mqttWorker.port.postMessage({hostname: window.location.hostname});
  swCh.onmessage = function(e) {
    if (e.data.hasOwnProperty('log')) {
      console.log(`MQTT SharedWorker sent ${e.data.log}`);
    }
    else if (e.data.hasOwnProperty('topic') && e.data.hasOwnProperty('payload')) {
      handleMessage(e.data.topic, e.data.payload);
    }
  }
}

function handleMessage(topic, payload) {
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
      if (this.cameraMap[id].port != val[0]
          || this.cameraMap[id].ts != val[3]
          || this.cameraMap[id].record != val[4]) {
        this.cameraMap[id].port = val[0];
        this.cameraMap[id].ts = val[3];
        this.cameraMap[id].record = val[4];
        window.localStorage.setItem('cameraMap', JSON.stringify(this.cameraMap));
      }
    }
    let statusNode = document.getElementById(`video-${id}-record`);
    if (statusNode) {
      if (this.cameraMap[id].record === "true") {
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
    //console.log(obj);
    let ts = new Date().getTime();
    let updateValues = {};
    var evtStatus = { mousedown: false, input: false };

    for (let prop in obj) {
      // limit big float precision
      if (prop.match('cpu') !== null) {
        let temp = parseFloat(obj[prop]).toFixed(2);
        obj[prop] = temp;
      }
      // update text and slider or button
      else if (prop.match('light\.[0-9]+\.currentPower') !== null) {
        const [device, node, func] = prop.split('.');
        if (typeof getStatus !== "undefined")
          evtStatus = getStatus(`${device}-${node}`);
        if (!(evtStatus.mousedown || evtStatus.input)) {
          let display = document.getElementById(`${device}-${node}-val`);
          if (display !== null) {
            display.innerHTML = `Power: ${obj[prop]}`;
          }
          display = document.getElementById(`${device}-${node}`);
          if (display !== null) {
            display.value = obj[prop];
          }
        }
      }
      else if (prop.match('servo\.[0-9]+\.') !== null) {
        const [device, node, func] = prop.split('.');
        let display = document.getElementById(`${device}-${node}-${func}-val`);
        if (display !== null) {
          if (func === 'speed')
            display.innerHTML = `spd: ${obj[prop]}`;
          else if (func === 'center')
            display.innerHTML = `ctr: ${obj[prop]}`;
          else
            display.innerHTML = `${func}: ${obj[prop]}`;
        }
        display = document.getElementById(`${device}-${node}-${func}`);
        if (display !== null) {
          display.value = obj[prop];
        }
      }
      else if (prop.match('camera\.[0-9]+\.') !== null) {
        const [device, node, func] = prop.split('.');
        if (func !== 'exposure') {
          let display = document.getElementById(`${func}-${node}-${obj[prop]}`);
          if (display !== null) {
            let items = document.getElementsByClassName(`${func}-${node}`);
            for (let i=0; i<items.length; i++) {
              items[i].classList.remove('dot-current');
            }
            display.classList.add('dot-current');
          }
        }
        else {
          let slider = document.getElementById(`${func}-${node}`);
          let display = document.getElementById(`${func}-${node}-val`);
          let val = parseInt(obj[prop]);
          if (slider !== null) {
            try {
              if (val > slider.max)
                slider.value = slider.max;
              else
                slider.value = val;
            }
            catch (e) {
              console.warn('error setting slider exposure on ', prop);
            }
          }
          if (display !== null) {
            if (val > 125)
              display.style = "color: red;";
            else
              display.style = "";
            display.innerHTML = `Time: ${val}ms`;
          }
        }
      }
      else if (prop.match('[A-z]+\.cmdStatus\.[0-9]+') !== null) {
        const [device, func, node] = prop.split('.');
        let map = {
          0: 'Idle',
          1: 'Opening',
          2: 'Opening',
          3: 'Closing',
          4: 'Closing',
          5: 'Braking',
          6: 'Overcurrent',
          7: 'Fault'
        }
        let status = map[obj[prop]];
        if (status === undefined)
          status = 'Unknown';
        let display = document.getElementById(`${device}-${node}-status`);
        if (display !== null)
          display.innerHTML = `Last: ${status}`;
      }
      // update telemetry charts
      // if ${prop}-values in DOM, update numeric display
      let id = `${prop}-values`;
      let chartValues = document.getElementById(id);
      if (chartValues !== null) {
        // multi-value
        let nodeId = prop.match(/\.([0-9]+)$/)
        if (nodeId !== null) {
          if (!updateValues[id] instanceof Array)
            updateValues[id] = []
          let k = nodeId[1];
          let v = parseFloat(obj[prop]).toFixed(2);
          updateValues[id].push({k: v});
        }
        // single value
        else
          chartValues.innerHTML = parseFloat(obj[prop]).toFixed(2);
      }
      if (typeof appendToChart !== "undefined") {
        appendToChart(ts, prop, obj[prop]);
      }
      if (typeof updateBriefValues !== "undefined") {
        updateBriefValues(prop, obj[prop]);
      }

    }
    // process updateValues
    for (let id in updateValues) {
      let el = document.getElementById(id);
      if (el !== null && updateValues[id] instanceof Array) {
        let ih = '';
        for (let i=0; i<updateValues[id].length; i++) {
          let o = updateValues[id].shift();
          let k = Object.keys(o)[0];
          ih += k + ':' + o[k];
        }
      }
    }
  }
}
