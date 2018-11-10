var dataMap = {};
var chartMap = {};
var previous = {};
var selectMap = {
  'CPU': 'cpu',
  'ROV (82) and Clump (81) Water Pressure (bar)': 'depth_p',
  'ROV (82) and Clump (81) Water Depth (m)': 'depth_d',
  'ROV (82) and Clump (81) Water Temperature (C)  ': 'depth_t',
  'ROV pitch (deg)': 'imu_p',
  'ROV roll (deg)': 'imu_r',
  'IMU Pressure': 'sensors.imuPressure',
  'IMU Temp': 'sensors.imuTemp',
  'Light Bus Current': 'light.bus_i',
  'Light Bus Voltage': 'light.bus_v',
  'Light Temp': 'light.temp',
  'Motor Bus Current': 'motors.bus_i',
  'Motor Bus Voltage': 'motors.bus_v',
  'Motor Temp': 'motors.temp',
  'Motor RPM': 'motors.rpm',
  'Motor Lift': 'motors.lift',
  'Motor Pitch': 'motors.pitch',
  'Motor Strafe': 'motors.strafe',
  'Motor Throttle': 'motors.throttle',
  'Motor Yaw': 'motors.yaw',
  'CT Sensor Temp (C)': 'ctsensor.temp',
  'CT Sensor Conductivity (mS/cm)': 'ctsensor.conductivity',
  'Gripper Temp': 'grippers.temp',
  'Gripper Current': 'grippers.current',
  'Power Supply 1 Currents': 'powerSupply1.current',
  'Power Supply 1 Voltages': 'powerSupply1.voltage',
  'Power Supply 1 Temperatures': 'powerSupply1.temp',
  'Power Supply 2 Currents': 'powerSupply2.current',
  'Power Supply 2 Voltages': 'powerSupply2.voltage',
  'Power Supply 2 Temperatures': 'powerSupply2.temp'
}

// Array length must match highest initChart() numLines parameter
var seriesOptions = [{
    strokeStyle: 'rgba(255, 0, 0, 1)',
    fillStyle: 'rgba(255, 0, 0, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(0, 255, 0, 1)',
    fillStyle: 'rgba(0, 255, 0, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(0, 0, 255, 1)',
    fillStyle: 'rgba(0, 0, 255, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(255, 255, 0, 1)',
    fillStyle: 'rgba(255, 255, 0, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(128, 128, 128, 1)',
    fillStyle: 'rgba(128, 128, 128, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(0, 255, 255, 1)',
    fillStyle: 'rgba(0, 255, 255, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(255, 0, 255, 1)',
    fillStyle: 'rgba(255, 0, 255, 0.1)',
    lineWidth: 3
  },
  {
    strokeStyle: 'rgba(64, 128, 128, 1)',
    fillStyle: 'rgba(64, 128, 128, 0.1)',
    lineWidth: 3
  }
];

var psOptions = [{
  strokeStyle: 'rgba(255, 255, 0, 1)',
  fillStyle: 'rgba(255, 255, 0, 0.1)',
  lineWidth: 3
},
{
  strokeStyle: 'rgba(0, 0, 255, 1)',
  fillStyle: 'rgba(0, 0, 255, 0.1)',
  lineWidth: 3
},
{
  strokeStyle: 'rgba(255, 165, 0, 1)',
  fillStyle: 'rgba(255, 165, 0, 0.1)',
  lineWidth: 3
},
{
  strokeStyle: 'rgba(255, 0, 0, 1)',
  fillStyle: 'rgba(255, 0, 0, 0.1)',
  lineWidth: 3
}];

function init() {
  initChart('cpu', ['cpu']);
  initChart('depth_p', ['depth_p', 'board44.pressure.81']);
  initChart('depth_d', ['depth_d', 'board44.depth.81']);
  initChart('depth_t', ['depth_t', 'board44.temp.81']);
  initChart('imu_p', ['imu_p']);
  initChart('imu_r', ['imu_r']);
  initChart('sensors.imuPressure', ['sensors.imuPressure.51', 'pilot.imuPressure.52', 'sensors.imuPressure.57', 'sensors.imuPressure.58', 'sensors.imuPressure.67']);
  initChart('sensors.imuTemp', ['sensors.imuTemp.51', 'pilot.imuTemp.52', 'sensors.imuTemp.57', 'sensors.imuTemp.58', 'sensors.imuTemp.67']);
  initChart('light.bus_i', ['light.bus_i.61', 'light.bus_i.62', 'light.bus_i.63', 'light.bus_i.65', 'light.bus_i.66']);
  initChart('light.bus_v', ['light.bus_v.61', 'light.bus_v.62', 'light.bus_v.63', 'light.bus_v.65', 'light.bus_v.66']);
  initChart('light.temp', ['light.temp.61', 'light.temp.62', 'light.temp.63', 'light.temp.65', 'light.temp.66']);
  initChart('motors.bus_i', ['motors.bus_i.12', 'motors.bus_i.13', 'motors.bus_i.14', 'motors.bus_i.15', 'motors.bus_i.16']);
  initChart('motors.bus_v', ['motors.bus_v.12', 'motors.bus_v.13', 'motors.bus_v.14', 'motors.bus_v.15', 'motors.bus_v.16']);
  initChart('motors.temp', ['motors.temp.12', 'motors.temp.13', 'motors.temp.14', 'motors.temp.15', 'motors.temp.16']);
  initChart('motors.rpm', ['motors.rpm.12', 'motors.rpm.13', 'motors.rpm.14', 'motors.rpm.15', 'motors.rpm.16']);
  initChart('motors.lift', ['motors.lift']);
  initChart('motors.pitch', ['motors.pitch']);
  initChart('motors.strafe', ['motors.strafe']);
  initChart('motors.throttle', ['motors.throttle']);
  initChart('motors.yaw', ['motors.yaw']);
  initChart('ctsensor.temp', ['board44.temp.85']);
  initChart('ctsensor.conductivity', ['board44.conductivity.85']);
  initChart('grippers.temp', ['gripper.temp.24', 'waterSampler.temp.24', 'trim.temp.21']);
  initChart('grippers.current', ['gripper.current.24', 'waterSampler.current.24', 'trim.current.21']);
  initChart('powerSupply1.current', ['board44.acs764n1.83', 'board44.acs764n2.83', 'board44.acs764n3.83', 'board44.acs764n4.83'], ['48v on 24', '12v on 12', '48v on 12', '24v on 24']);
  initChart('powerSupply1.voltage', ['board44.adc2.83', 'board44.adc4.83', 'board44.adc5.83', 'board44.adc6.83'], ['5V', '48V', '24V', '12V']);
  initChart('powerSupply1.temp', ['board44.adc1.83', 'board44.adc7.83'], ['Temp 12', 'Temp 24']);
  initChart('powerSupply2.current', ['board44.acs764n1.87', 'board44.acs764n2.87', 'board44.acs764n3.87', 'board44.acs764n4.87'], ['48v on 24', '12v on 12', '48v on 12', '24v on 24']);
  initChart('powerSupply2.voltage', ['board44.adc2.87', 'board44.adc4.87', 'board44.adc5.87', 'board44.adc6.87'], ['5V', '48V', '24V', '12V']);
  initChart('powerSupply2.temp', ['board44.adc1.87', 'board44.adc7.87'], ['Temp 12', 'Temp 24']);


  initMqtt();
  initGrid('telemetryBriefLayout');
  initListeners();
}

function initMqtt() {
  var client = mqtt.connect('ws://' + window.location.hostname + ':3000');
  client.on('connect', function (connack) {
    client.subscribe('telemetry/update', function (e) {
      if (!e) {
        console.log('Subscribed to MQTT telemetry/update');
      }
    });
    client.subscribe('toCamera/cameraRegistration', function (e) {
      if (!e) {
        console.log('Subscribed to MQTT toCamera/cameraRegistration');
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
    if (topic === 'telemetry/update') {
      let obj = JSON.parse(payload);
      let ts = new Date().getTime();
      for (let prop in obj) {
        if (dataMap.hasOwnProperty(prop)) {
          dataMap[prop].append(ts, obj[prop]);
        }
      }
    }
  });
}

function initChart(chartName, properties, labels) {

  let numLines = 1;
  if (Array.isArray(properties)) {
    numLines = properties.length;
  }
  // Build the chart object
  var timeline = new SmoothieChart({
    millisPerPixel: 1500,
    responsive: true,
    tooltip: true,
    grid: {
      strokeStyle: '#555555',
      lineWidth: 1,
      millisPerLine: 40000,
      verticalSections: 4,
    }
  });

  // Add each TimeSeries to the chart
  // Bind MQTT telemetry update values to timeSeries
  // Don't streamTo() chart until it is selected by user
  for (var i = 0; i < numLines; i++) {
    let series = new TimeSeries();
    let options = seriesOptions[i];
    if (chartName.match(/powerSupply.*/) !== null) {
      options = psOptions[i];
      options.tooltipLabel = labels[i];
    }
    else if (properties[i].match(/\.[0-9]+$/) !== null) {
      let tooltips = properties[i].split(/\./);
      options.tooltipLabel = tooltips[tooltips.length-1];
    }
    dataMap[properties[i]] = series;
    timeline.addTimeSeries(series, options);
  }
  chartMap[chartName] = timeline;
}

// add change event listener and populate select list values
function initListeners() {
  const selectors = document.getElementsByTagName('select');
  selectList = Array.prototype.slice.call(selectors);
  selectList.forEach(function(selector, idx) {
    for (let prop in selectMap) {
      if (typeof selectMap[prop] !== 'function') {
        let option = document.createElement("option");
        option.text = prop;
        selector.add(option);
      }
    }
    selector.addEventListener('change', async function () {
      // set chart title
      let titleNode = document.getElementById(`title-${this.id}`);
      titleNode.innerHTML = this.value;

      let canvas = document.getElementById(`canvas-${this.id}`);
      let timeline = chartMap[selectMap[this.value]];
      // stop streaming data to previous chart selection
      if (previous[this.id] instanceof SmoothieChart) {
        await previous[this.id].stop();
      }
      previous[this.id] = timeline;
      timeline.streamTo(canvas, 1000);
    }, false);
  });
}
