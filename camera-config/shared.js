const EventEmitter     = require('events');
const syslog           = require('syslog-client');
const mqtt             = require('mqtt');
const logger    = syslog.createClient('logger');
const ERROR     = { severity: syslog.Severity.Error };
const WARN      = { severity: syslog.Severity.Warning };
const CRIT      = { severity: syslog.Severity.Critical };
const DEBUG     = { severity: syslog.Severity.Debug };

class MqttClient extends EventEmitter {
  constructor(clientId, willTopic) {
    super();
    // Mqtt info
    this.mqttConnected = false;
    this.mqttUri = 'ws://127.0.0.1:3000';
    this.clientId = clientId;
    this.willTopic = willTopic;

    // Connect to MQTT broker and setup all event handlers
    // This is used to publish camera settings to camera viewers for controls
    this.client = mqtt.connect(this.mqttUri, {
      protocolVersion: 4,
      resubscribe: true,
      clientId: this.clientId,
      keepalive: 15,
      will: {
        topic: this.willTopic,
        payload: 'MQTT client disconnected!',
        qos: 0,
        retain: false
      }
    });

    this.client.on('connect', () => {
      this.mqttConnected = true;
      logger.log('MQTT broker connection established!');
      this.emit('connect');
    });

    this.client.on('reconnect', () => {
      this.mqttConnected = true;
      logger.log('MQTT broker re-connected!', WARN);
    });

    this.client.on('offline', () => {
      this.mqttConnected = false;
      logger.log('MQTT broker connection offline!', WARN);
    });

    this.client.on('close', () => {
      // connection state is also set to false in class close() method
      this.mqttConnected = false;
      logger.log('MQTT broker connection closed!', WARN);
    });

    this.client.on('error', (err) => {
      logger.log(`MQTT error: ${err}`, ERROR);
    });

    this.client.on('message', (topic, message) => {
      this.emit('message', topic, message);
    })
  }

  subscribe(topic) {
    this.client.subscribe(topic);
  }

  publish(topic, message) {
    // can only publish strings
    let msg_s;
    if (message instanceof Object) {
      msg_s = JSON.stringify(message)
    }
    else {
      msg_s = message
    }
    this.client.publish(topic, msg_s);
  }
}

module.exports = {
  MqttClient: MqttClient,
  logger: logger,
  ERROR: ERROR,
  WARN: WARN,
  CRIT: CRIT,
  DEBUG: DEBUG
}
