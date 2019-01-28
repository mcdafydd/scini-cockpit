const ElphelDriver = require('./ElphelDriver').ElphelDriver;
const shared       = require('./shared');
const fs           = require('fs');
const MqttClient   = shared.MqttClient;
const logger       = shared.logger;

class CameraConfig {
  constructor(location, cameraIp) {
    logger.log('Camera-config service loaded!');

    this.location = location;
    this.cameraIp = cameraIp;
    this.camera = new ElphelDriver(cameraIp, location);

    this.mqttConnected = false;
    this.mqttUri = 'ws://127.0.0.1:3000';
    this.mqttClient = new MqttClient(`camera-config-${this.location}`, `fromCameraConfig/${this.location}/will`);

    this.mqttClient.on('connect',  () => {
      this.mqttConnected = true;
      logger.log(`CAMERA-CONFIG-${this.location}: MQTT broker connection established!`);
      //this.mqttClient.subscribe('$SYS/+/new/clients');
      this.mqttClient.subscribe('toCameraConfig/+'); // receive all camera control requests
      this.mqttClient.subscribe(`toCameraConfig/${this.location}/+`);
      this.mqttClient.subscribe('fromBroker/clientConnected/ipaddr'); // receive clientID-IPaddr mapping

      this.addEventListener('publishSettings', (e) => {
        this.publishSettings();
      });
    });
    this.mqttClient.on('message', (topic, message) => {
      // handle Elphel camera control messages from the view-only browser clients
      // and re-emit them as events
      // openrov-cockpit pilot user emits events directly to handlers above
      if (topic === 'fromBroker/clientConnected/ipaddr') {
        let parts = message.toString().split(':');
        //let clientId = parts[0];
        let cameraIp = parts[1];

        // if camera connects to MQTT broker, send normal defaults one time
        if (this.cameraIp === cameraIp) {
          logger.log(`CAMERA-CONFIG-${this.location}: camera joined at IP address ${cameraIp}`);

          // set last known values if they exist
          if (this.camera.bootSettingsChanged === true) {
            logger.log(`CAMERA-CONFIG-${this.location}: Pushing last known camera settings to ${this.cameraIp}`);
            this.camera.setCamera('last');
          } else {
            // this will be the case on server restart since the settings above don't persist
            // just get what should be the sensible on-boot defaults for the camera
            this.camera.setCamera('defaults');
          }
        }
      }
      else if (topic === 'toCameraConfig/getSettings') {
        this.publishSettings();
      }
      else if (topic.match(`toCameraConfig/${this.location}/.*`) !== null) {
        let command = topic.split('/');
        let func = command[2];
        let value = parseInt(message.toString(), 10);
        switch (func) {
          case 'exposure':
            this.camera.exposure(value);
            break;
          case 'resolution':
            this.camera.resolution(value);
            break;
          case 'quality':
            this.camera.quality(value);
            break;
          case 'color':
            // raw/normal events not available in viewer client controls yet
            this.camera.color(value);
            break;
          case 'snap':
            this.camera.snap(value);
            break;
          case 'temp':
            this.camera.temp();
            break;
          case 'autoexposure':
            this.camera.autoexposure(value);
            break;
          case 'defaults':
            this.camera.setCamera('defaults');
            break;
          case 'fliph':
            this.camera.fliph(value);
            break;
          case 'flipv':
            this.camera.flipv(value);
            break;
          case 'fps':
            this.camera.fps(value);
            break;
          case 'whitebalance':
            this.camera.whitebalance(value);
            break;
          case 'getSettings':
            // get current settings for camera and publish to MQTT
            this.camera.getCamSettings();
            break;
          default:
            break;
        }
      }
    });
  }

  publishSettings() {
    // emit settings to subscribers
    let data = {};
    data[this.location] = {};
    data[this.location].cameraConfig = this.camera.getLastSettings();
    if (this.mqttConnected === true) {
      this.mqttClient.publish(`fromCameraConfig/${this.location}/status`, JSON.stringify(data));
    }
  }
}

let location = process.env.LOCATION !== undefined ? process.env.LOCATION: 'other';
let cameraIp = process.env.CAMERAIP !== undefined ? process.env.CAMERAIP: process.exit(1);

let service = new CameraConfig(location, cameraIp);
