const MjpgStreamer = require('./MjpgStreamer').MjpgStreamer;
const shared       = require('./shared');
const MqttClient   = shared.MqttClient;
const logger       = shared.logger;

class Streamer {
  constructor(location, cameraUri, wsPort) {
    logger.log(`STREAMER-${this.location}: Streamer service loaded!`);

    this.location = location;
    this.mqttClient = new MqttClient(`streamer-${this.location}`, `fromStreamer/${this.location}/will`);
    this.streamer = new MjpgStreamer(cameraUri, wsPort);
    this.streamer.start();

    this.mqttClient.on('connect',  () => {
      //this.mqttClient.subscribe('$SYS/+/new/clients');
      this.mqttClient.subscribe('toStreamer/+'); // receive all camera control requests
      this.mqttClient.subscribe(`toStreamer/${this.location}/+`);
    });

    this.mqttClient.on('message', (topic, message) => {
      logger.log(`STREAMER-${this.location}: received message on topic ${topic}`, shared.DEBUG);
      if (topic === 'toStreamer/getStatus') {
        //return recording status, and streamer IP/port config
        let data = {
          recording: this.streamer.recording,
          wsPort: this.streamer.wsPort,
          ip: this.streamer.uri.hostname,
          ts: this.streamer.ts
        };
        this.mqttClient.publish(`fromStreamer/${this.location}/status`, JSON.stringify(data));
      }
      else if (topic.match(`toStreamer/${this.location}/.*`) !== null) {
        let command = topic.split('/');
        let func = command[2];
        let value = parseInt(message.toString(), 10);
        switch (func) {
          case 'record':
            this.streamer.record(value);
            break;
          case 'restart':
            this.streamer.restart();
            break;
          default:
            break;
        }
      }
    });
  }
}

let location = process.env.LOCATION !== undefined ? process.env.LOCATION: 'other';
let cameraUri = process.env.CAMERAURI !== undefined ? process.env.CAMERAURI: process.exit(1);
let wsPort = process.env.WSPORT !== undefined ? process.env.WSPORT: process.exit(1);

let service = new Streamer(location, cameraUri, wsPort);
