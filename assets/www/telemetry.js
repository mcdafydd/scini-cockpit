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
  initChart('cpu', 1, ['cpu']);
  initChart('camTemp', 5, ['camTemp.8200', 'camTemp.8201', 'camTemp.8202', 'camTemp.8203', 'camTemp.8204']);
  initChart('depth_p', 4, ['depth_p']);
  initChart('lights.bus_i', 5, ['lights.bus_i.61', 'lights.bus_i.62', 'lights.bus_i.63', 'lights.bus_i.65', 'lights.bus_i.66']);
  initChart('lights.bus_v', 5, ['lights.bus_v.61', 'lights.bus_v.62', 'lights.bus_v.63', 'lights.bus_v.65', 'lights.bus_v.66']);
  initChart('lights.temp', 5, ['lights.temp.61', 'lights.temp.62', 'lights.temp.63', 'lights.temp.65', 'lights.temp.66']);
  initChart('motors.bus_i', 5, ['motors.bus_i.12', 'motors.bus_i.13', 'motors.bus_i.14', 'motors.bus_i.15', 'motors.bus_i.16']);
  initChart('motors.bus_v', 5, ['motors.bus_v.12', 'motors.bus_v.13', 'motors.bus_v.14', 'motors.bus_v.15', 'motors.bus_v.16']);
  initChart('motors.temp', 5, ['motors.temp.12', 'motors.temp.13', 'motors.temp.14', 'motors.temp.15', 'motors.temp.16']);
  initChart('motors.rpm', 5, ['motors.rpm.12', 'motors.rpm.13', 'motors.rpm.14', 'motors.rpm.15', 'motors.rpm.16']);
  initMqtt();

  // Create draggable chart grid
  var grid = new Muuri('.grid', { dragEnabled: true });
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

function initChart(chartName, numLines, properties) {

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
    if (properties[i].match('\.[0-9]+$') !== null) {
      let labels = properties[i].split(/\./);
      options.tooltipLabel = labels[labels.length-1];
    }
    dataMap[properties[i]] = series;
    timeline.addTimeSeries(series, options);
  }
  timeline.streamTo(document.getElementById(chartName), 1000);
}