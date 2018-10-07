// Maps chart timeSeries() objects to telemetry properties
var dataMap = {};

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
  }
];

function init() {
  initChart('cpu', ['cpu']);
  initChart('depth_p', ['depth_p']);
  initChart('depth_d', ['depth_d']);
  initChart('depth_t', ['depth_t']);
  initChart('imu_p', ['imu_p']);
  initChart('imu_r', ['imu_r']);
  initChart('sensors.imuPressure', ['sensors.imuPressure.51', 'pilot.imuPressure.52', 'sensors.imuPressure.53', 'sensors.imuPressure.54', 'sensors.imuPressure.55']);
  initChart('sensors.imuTemp', ['sensors.imuTemp.51', 'pilot.imuTemp.52', 'sensors.imuTemp.53', 'sensors.imuTemp.54', 'sensors.imuTemp.55']);
  initChart('lights.bus_i', ['lights.bus_i.61', 'lights.bus_i.62', 'lights.bus_i.63', 'lights.bus_i.65', 'lights.bus_i.66']);
  initChart('lights.bus_v', ['lights.bus_v.61', 'lights.bus_v.62', 'lights.bus_v.63', 'lights.bus_v.65', 'lights.bus_v.66']);
  initChart('lights.temp', ['lights.temp.61', 'lights.temp.62', 'lights.temp.63', 'lights.temp.65', 'lights.temp.66']);
  initChart('motors.bus_i', ['motors.bus_i.12', 'motors.bus_i.13', 'motors.bus_i.14', 'motors.bus_i.15', 'motors.bus_i.16']);
  initChart('motors.bus_v', ['motors.bus_v.12', 'motors.bus_v.13', 'motors.bus_v.14', 'motors.bus_v.15', 'motors.bus_v.16']);
  initChart('motors.temp', ['motors.temp.12', 'motors.temp.13', 'motors.temp.14', 'motors.temp.15', 'motors.temp.16']);
  initChart('motors.rpm', ['motors.rpm.12', 'motors.rpm.13', 'motors.rpm.14', 'motors.rpm.15', 'motors.rpm.16']);
  initChart('motors.lift', ['motors.lift']);
  initChart('motors.pitch', ['motors.pitch']);
  initChart('motors.strafe', ['motors.strafe']);
  initChart('motors.throttle', ['motors.throttle']);
  initChart('motors.yaw', ['motors.yaw']);

  initMqtt();
  initGrid('telemetryLayout');
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
    let obj = JSON.parse(payload);
    if (topic === 'telemetry/update') {
      let ts = new Date().getTime();
      for (let prop in obj) {
        if (dataMap.hasOwnProperty(prop)) {
          dataMap[prop].append(ts, obj[prop]);
        }
      }
    }
  });
}

function initChart(chartName, properties) {

  let numLines = 1;
  if (Array.isArray(properties)) {
    numLines = properties.length;
  }
  // Build the chart object
  var timeline = new SmoothieChart({
    millisPerPixel: 20,
    responsive: true,
    tooltip: true,
    grid: {
      strokeStyle: '#555555',
      lineWidth: 1,
      millisPerLine: 1000,
      verticalSections: 4,
    }
  });

  // Add each TimeSeries to the chart
  // Bind MQTT telemetry update values to timeSeries
  for (var i = 0; i < numLines; i++) {
    let series = new TimeSeries();
    let options = seriesOptions[i];
    if (properties[i].match(/\.[0-9]+$/) !== null) {
      let labels = properties[i].split(/\./);
      options.tooltipLabel = labels[labels.length-1];
    }
    dataMap[properties[i]] = series;
    timeline.addTimeSeries(series, options);
  }
  timeline.streamTo(document.getElementById(chartName), 1000);
}