import { MjpgStreamer } from './MjpgStreamer';
import { MqttClient, logger, ERROR, WARN, CRIT, DEBUG } from './shared';

class Streamer {
  constructor(location, cameraUri, wsPort) {
    logger.log('Streamer service loaded!');

    this.location = location;
    this.mqttClient = new MqttClient('camera-bridge', 'fromStreamer/status')
    this.streamer = new MjpgStreamer(cameraUri, wsPort);

    this.mqttClient.on('connect',  () => {
      //this.mqttClient.subscribe('$SYS/+/new/clients');
      this.mqttClient.subscribe('toStreamer/+'); // receive all camera control requests
      this.mqttClient.subscribe(`toStreamer/${this.location}/+`);
    });

    this.mqttClient.on('message', (topic, message) => {
      if (topic.match(`toStreamer/${this.location}/.*`) !== null) {
        let command = topic.split('/');
        let func = command[2];
        let value = parseInt(message, 10);
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
let wsPort = process.env['WSPORT'] !== undefined ? process.env['WSPORT']: process.exit(1);

let service = new Streamer(location, cameraUri, wsPort);
