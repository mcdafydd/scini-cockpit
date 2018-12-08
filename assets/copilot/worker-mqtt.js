let topicsList = ['telemetry/update', 'toCamera/cameraRegistration'];
let mqttConnected = false;
let mqttClient;
let swCh = new BroadcastChannel('swCh');


importScripts('browserMqtt.js');

onconnect = function(e) {
  var port = e.ports[0];
  let msg = JSON.stringify(e);
  swCh.postMessage({log: `MQTT shared worker connected ${msg}`});
  port.onmessage = function(e) {
    // publish message
    if (e.data.hasOwnProperty('topic')
        && e.data.hasOwnProperty('payload')
        && mqttConnected === true) {
          mqttClient.publish(e.data.topic, e.data.payload);
    }
    // connect to MQTT broker if not connected
    else if (e.data.hasOwnProperty('hostname') && mqttConnected === false) {
      var brokerUri = `ws://${e.data.hostname}:3000`;
      mqttClient = mqtt.connect(brokerUri, {
        keepalive: 15
      });
      mqttClient.on('connect', function (connack) {
        if (connack) {
          mqttConnected = true;
          swCh.postMessage({log: `Connected to MQTT broker ${brokerUri}`});
          for (let i=0; i < topicsList.length; i++) {
            mqttClient.subscribe(topicsList[i], function (e) {
              if (!e) {
                swCh.postMessage({log: `Subscribed to MQTT topic ${topicsList[i]}`});
              }
            });
          }
        }
      });
      mqttClient.on('offline', function () {
        mqttConnected = false;
        swCh.postMessage({log: 'MQTT client offline'});
      });
      mqttClient.on('reconnect', function () {
        mqttConnected = true;
        swCh.postMessage({log: 'MQTT client reconnected'});
      });
      mqttClient.on('error', function (err) {
        swCh.postMessage({log: `MQTT client error: ${err}`});
      });
      // send any received messages and topics back to browser contexts
      mqttClient.on('message', function (topic, payload) {
        let value = new TextDecoder("utf-8").decode(payload);
        swCh.postMessage({topic: topic, payload: value});
      });
    }
  }
}