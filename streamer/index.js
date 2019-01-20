import { ElphelDriver } from './ElphelDriver';
import { MjpgStreamer } from './MjpgStreamer';

const mqtt          = require('mqtt');
const syslog        = require('syslog-client');
const logger        = syslog.createClient('logger');
const ERROR         = syslog.Severity.Error;
const WARN          = syslog.Severity.Warning;

let configFile;
if(!fs.existsSync('/srv/config/cameraMap.json') ||
      fs.statSync('/srv/config/cameraMap.json').size === 0) {
  logger.error('BRIDGE: /srv/config/cameraMap.json - file not found or zero size');
  logger.error('BRIDGE: Exiting...');
  process.exit(1);
}
else {
  configFile = fs.readFileSync('/srv/config/cameraMap.json');
}

class CameraService {
  constructor() {
    logger.log('Streamer service loaded!');

    // Mqtt info
    this.mqttConnected = false;
    this.mqttUri = 'ws://127.0.0.1:3000';

    this.cameraMap = {};
    this.location = process.env['LOCATION'] !== undefined ? process.env['LOCATION']: 'forward';

    this.camera = new ElphelDriver('192.168.2.215');
    this.streamer = new MjpgStreamer();

    // Connect to MQTT broker and setup all event handlers
    // This is used to publish camera settings to camera viewers for controls
    this.client = mqtt.connect(this.mqttUri, {
      protocolVersion: 4,
      resubscribe: true,
      clientId: 'camera-bridge',
      keepalive: 15,
      will: {
        topic: 'fromStreamer/status',
        payload: 'STREAMER: MQTT client disconnected!',
        qos: 0,
        retain: false
      }
    });

    this.client.on('connect', () => {
      this.mqttConnected = true;
      logger.log('STREAMER: MQTT broker connection established!');
      //this.client.subscribe('$SYS/+/new/clients');
      this.client.subscribe('toStreamer/+'); // receive all camera control requests
      this.client.subscribe(`toStreamer/${this.location}/+`);
      this.client.subscribe('fromBroker/clientConnected/ipaddr'); // receive clientID-IPaddr mapping
    });

    this.client.on('reconnect', () => {
      this.mqttConnected = true;
      logger.log('STREAMER: MQTT broker re-connected!', { severity: WARN });
    });

    this.client.on('offline', () => {
      this.mqttConnected = false;
      logger.log('STREAMER: MQTT broker connection offline!', { severity: WARN });
    });

    this.client.on('close', () => {
      // connection state is also set to false in class close() method
      this.mqttConnected = false;
      logger.log('STREAMER: MQTT broker connection closed!', { severity: WARN });
    });

    this.client.on('error', (err) => {
      logger.log(`STREAMER: MQTT error: ${err}`, { severity: ERROR });
    });

    this.client.on('message', (topic, message) => {
      // handle Elphel camera control messages from the view-only browser clients
      // and re-emit them as events
      // openrov-cockpit pilot user emits events directly to handlers above
      if (topic === 'fromBroker/clientConnected/ipaddr') {
        let parts = message.split(':');
        //let clientId = parts[0];
        let cameraIp = parts[1];

        // if camera connects to MQTT broker, send normal defaults one time
        if (this.cameraIp === cameraIp) {
          logger.log(`STREAMER: camera joined at IP address ${cameraIp}`);
          // default is only normal color (not JP4), white balance enable
          // the remaining parameters should be set only if we have them
          let defaultsUri;
          // handle camera mounted upside-down
          if (cameraIp === '192.168.2.218') {
            defaultsUri += '&FLIPH=1&FLIPV=1';
          }
          //this.camera.defaults();
          // set last known values if they exist
          if (this.cameraMap.hasOwnProperty(cameraIp)) {
            if (this.cameraMap[cameraIp].hasOwnProperty('autoexposure')) {
              let autoexp = this.cameraMap[cameraIp].autoexposure;
              defaultsUri += `&AUTOEXP_ON=${autoexp}`;
            }
            if (this.cameraMap[cameraIp].hasOwnProperty('resolution')) {
              let res = this.cameraMap[cameraIp].resolution;
              defaultsUri += `&BIN_HOR=${res}&BIN_VERT=${res}&DCM_HOR=${res}&DCM_VERT=${res}`;
            }
            if (this.cameraMap[cameraIp].hasOwnProperty('quality')) {
              let qual = this.cameraMap[cameraIp].quality;
              defaultsUri += `&QUALITY=${qual}`;
            }
            if (this.cameraMap[cameraIp].hasOwnProperty('exposure')) {
              let exp = this.cameraMap[cameraIp].exposure;
              defaultsUri += `&EXPOS=${exp}`;
            }
            logger.log(`STREAMER: Pushing last known camera settings uri ${defaultsUri}`);
          } else {
            // this will be the case on server restart since the settings above don't persist
            // just get what should be the sensible on-boot defaults for the camera
            // and emit them via MQTT for clients
            this.camera.getCamSettings();
          }
          // in either case, on connect, just make sure the defaultsUri is sent
          request({
            timeout: 2000,
            uri: defaultsUri
          }, function (err, response, body) {
            if (response && response.statusCode == 200) {
              logger.log(`STREAMER: Last known settings set on camera ${cameraIp}`);
              this.cockpitBus.emit('plugin.elphel-config.getCamSettings', cameraIp);
              // add IP to cameraMap with default properties on success
              if (!this.cameraMap.hasOwnProperty(cameraIp))
                this.cameraMap[cameraIp] = {};
            }
            if (err) {
              logger.log(`STREAMER: Setting defaults failed with error: ${err}`, { severity: ERROR });
            }
          });
        }
      }
      else if (topic === 'toStreamer/getCameraMap') {

      }
      else if (topic.match(`toStreamer/${this.location}/.*`) !== null) {
        let command = topic.split('/');
        let func = command[2];
        let value = parseInt(message, 10);
        switch (func) {
          case 'exposure':
            camera.exposure(value);
            break;
          case 'resolution':
            camera.resolution(value);
            break;
          case 'record':
            streamer.record(value);
            break;
          case 'restart':
            streamer.restart();
            break;
          case 'quality':
            camera.quality(value);
            break;
          case 'color':
            // raw/normal events not available in viewer client controls yet
            camera.color(value);
            break;
          case 'snap':
            camera.snap(value);
            break;
          case 'temp':
            camera.temp();
            break;
          case 'autoexposure':
            camera.autoexposure(value);
            break;
          case 'defaults':
            camera.defaults(value);
            break;
          case 'fliph':
            camera.fliph(value);
            break;
          case 'flipv':
            camera.flipv(value);
            break;
          case 'fps':
            camera.fps(value);
            break;
          case 'whitebalance':
            camera.whitebalance(value);
            break;
          case 'getSettings':
            // get current settings for camera and publish to MQTT
            camera.getSettings(value);
            break;
          default:
            break;
        }
      } else if (topic.match('toCamera/cameraRegistration') !== null) {
        // add both port and ipAddress as keys to aid lookups for pilot cam
        let val = message.toString().split(':');
        this.cameraMap[val[0]] = {};
        this.cameraMap[val[0]].ipAddress = val[1];
        this.cameraMap[val[0]].id = val[2]; // either 'pilot' or last IP address octet
        this.cameraMap[val[0]].ts = val[3]; // timestamp used for image record directory
        this.cameraMap[val[0]].record = val[4]; // recording enabled true/false

        if (!this.cameraMap.hasOwnProperty(val[1])) {
          this.cameraMap[val[1]] = {};
        }

        this.cameraMap[val[1]].port = val[0];
        this.cameraMap[val[1]].id = val[2]; // either 'pilot' or last IP address octet
        this.cameraMap[val[1]].ts = val[3]; // timestamp used for image record directory
        this.cameraMap[val[1]].record = val[4]; // recording enabled true/false
      }
    });
  }
}

let service = new CameraService();
