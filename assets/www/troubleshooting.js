var client;

function init() {
  initMqtt();
  initListeners();

  let ua = navigator.appVersion.match(/Chrome\/.*\ /);
  let browser = document.getElementById('browser');
  if (ua !== null) {
    browser.style = 'color:greenyellow;';
    browser.innerHTML = ua[0] + '.';
  }
  else {
    browser.style = 'color:red;';
    browser.innerHTML = 'something else. Fix this first!';
  }
}

function initMqtt() {
  client = mqtt.connect('ws://' + window.location.hostname + ':3000');
  client.on('connect', function (connack) {
    if (connack) {
      console.log('Connected to MQTT broker');
    }
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
  });
}

function initListeners() {
  const button = document.getElementById('video-restart');
  button.addEventListener('click', function() {
    console.log('clicked ', this.id);
    client.publish('video/restart', '1');
  }, false);
}