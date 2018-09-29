function init() {
  initChart('cpu', 1, ['cpu']);
  initChart('camTemp', 5, ['camTemp.8200', 'camTemp.8201', 'camTemp.8202', 'camTemp.8203', 'camTemp.8204']);
  initChart('depth_p', 4, []);
  initChart('lights.bus_i', 5, []);
  initChart('lights.bus_v', 5, []);
  initChart('lights.temp', 5, []);
  initChart('motors.bus_i', 5, []);
  initChart('motors.bus_v', 5, []);
  initMqtt();
}

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
        dataMap[prop].append(ts, obj[prop]);
      }
    //console.log(obj);
    }
  });
}

function initChart(chartName, numLines, properties) {
  dataMap[chartName] = {};

  // Build the chart object
  var timeline = new SmoothieChart({
    millisPerPixel: 20,
    responsive: true,
    tooltip: true,
    grid: {
      strokeStyle: '#555555',
      lineWidth: 1,
      millisPerLine: 1000,
      verticalSections: 4
    }
  });

  // Add each TimeSeries to the chart
  // Bind MQTT telemetry update values to timeSeries
  for (var i = 0; i < numLines; i++) {
    let series = new TimeSeries();
    dataMap[properties[i]] = series;
    timeline.addTimeSeries(series, seriesOptions[i]);
  }
  timeline.streamTo(document.getElementById(chartName), 1000);
}