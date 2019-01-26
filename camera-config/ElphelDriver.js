const request      = require('request');
const shared       = require('./shared');
const fs           = require('fs');
const logger       = shared.logger;
const ERROR        = shared.ERROR;
const WARN         = shared.WARN;
const DEBUG        = shared.DEBUG;

class ElphelDriver {
  constructor(cameraIp) {
    // Elphel 353 settings URI
    this.baseUri = 'http://${cameraIp}/parsedit.php?immediate';
    this.cameraip = cameraIp;

    // camera defaults to send on mqtt clientConnect
    //this.quality = 85; // 85% JPEG compression
    //this.exposure = 100000; // in microseconds
    //this.resolution = 4; // 1/n resolution
  }

  autoexposure(autoexp) {
    if (autoexp == 0 || autoexp == 1) {
      let aeText = autoexp == 1 ? 'enabled' : 'disabled';
      request({
        timeout: 2000,
        uri: `http://${this.cameraip}/setparameters_demo.php?AUTOEXP_ON=${autoexp}`
      }, function (err, response, body) {
        if (response && response.statusCode == 200) {
          logger.log(`STREAMER: Set autoexposure ${aeText} on camera ${this.cameraip}`);
          setTimeout(() => {
            this.cockpitBus.emit('plugin.elphel-config.getCamSettings', this.cameraip);
          }, 500);
          if (this.cameraMap.hasOwnProperty(cameraIp))
            this.cameraMap[cameraIp].autoexposure = autoexp;
        }
        if (err) {
          logger.log(`STREAMER: Setting autoexposure on camera ${this.cameraip} failed with error: ${err}`, { severity: WARN });
        }
      });
    } else {
      logger.log(`STREAMER: Invalid autoexposure value ${autoexp} for camera ${this.cameraip} - ignoring`, { severity: ERROR });
    }
  }

  color(color) {
    if (color === 1 || color === 5) {
      let colorText = color === 1 ? 'normal' : 'raw';
      // Send command to camera
      if (this.cameraip === 'pilot')
        this.cameraip = process.env['EXTERNAL_CAM_IP'];
      request({
        timeout: 2000,
        uri: `http://${this.cameraip}/setparameters_demo.php?COLOR=${color}`
      }, function (err, response, body) {
        if (response && response.statusCode == 200) {
          logger.log(`STREAMER: Set color ${colorText} on camera ${this.cameraip}`);
          setTimeout(() => {
            this.cockpitBus.emit('plugin.elphel-config.getCamSettings', this.cameraip);
          }, 500);
        }
        if (err) {
          logger.log(`STREAMER: Setting color on camera ${this.cameraip} failed with error: ${err}`, { severity: WARN });
        }
      });
    } else {
      logger.log(`STREAMER: Invalid color value ${color} for camera ${this.cameraip} - ignoring`, { severity: ERROR });
    }
  }

  exposure(exposure) {
    let newExposure;
    if ((exposure >= 1 && exposure <= 300) || exposure === 1 || exposure === -1) {
      // Send command to camera
      if (this.cameraip === 'pilot')
        this.cameraip = process.env['EXTERNAL_CAM_IP'];
      if (this.cameraMap.hasOwnProperty(cameraIp)) {
        if (this.cameraMap[cameraIp].hasOwnProperty('exposure') && (exposure === 1 || exposure === -1)) {
          newExposure = this.cameraMap[cameraIp].exposure + exposure * 1000; // value should be in microseconds
        } else {
          newExposure = exposure * 1000; // value should be in microseconds
        }
      }
      request({
        timeout: 2000,
        uri: `http://${this.cameraip}/setparameters_demo.php?EXPOS=${newExposure}`
      }, function (err, response, body) {
        if (response && response.statusCode == 200) {
          logger.log(`STREAMER: Setting exposure ${newExposure}us on camera ${this.cameraip}`);
          setTimeout(() => {
            this.cockpitBus.emit('plugin.elphel-config.getCamSettings', this.cameraip);
          }, 500);
          if (this.cameraMap.hasOwnProperty(cameraIp))
            this.cameraMap[cameraIp].exposure = newExposure;
        }
        if (err) {
          logger.log(`STREAMER: Setting exposure on camera ${this.cameraip} failed with error: ${err}`, { severity: WARN });
        }
      });
    } else {
      logger.log(`STREAMER: Invalid exposure value ${exposure}ms for camera ${this.cameraip} - ignoring`, { severity: ERROR });
    }
  }

  defaults() {

  }

  fliph() {

  }

  flipv() {

  }

  fps() {

  }

  getCamSettings() {
    let settingsPath = 'parsedit.php?immediate&COLOR&EXPOS&QUALITY&DCM_HOR&FLIPV&FLIPH&AUTOEXP_ON&WB_EN';
    let subProp = 'unknown';
    // Send command to camera
    if (this.cameraip === 'pilot')
      this.cameraip = process.env['EXTERNAL_CAM_IP'];
    if (this.cameraMap.hasOwnProperty(cameraIp)) {
      subProp = cameraIp.split('.')[3];
    }
    let prop = `camera.${subProp}`;
    let statusobj = {};
    request({
      timeout: 2000,
      uri: `http://${this.cameraip}/${settingsPath}`
    }, function (err, response, body) {
      if (response && response.statusCode == 200) {
        parseString(body, function (err, result) {
          if (result) {
            if (result.hasOwnProperty('parameters')) {
              if (result.parameters.hasOwnProperty('COLOR'))
                statusobj[`${prop}.color`] = parseInt(result.parameters.COLOR);
              if (result.parameters.hasOwnProperty('EXPOS'))
                statusobj[`${prop}.exposure`] = parseInt(result.parameters.EXPOS) / 1000; // ms
              if (result.parameters.hasOwnProperty('QUALITY'))
                statusobj[`${prop}.quality`] = parseInt(result.parameters.QUALITY);
              if (result.parameters.hasOwnProperty('DCM_HOR'))
                statusobj[`${prop}.resolution`] = parseInt(result.parameters.DCM_HOR);
              if (result.parameters.hasOwnProperty('FLIPV'))
                statusobj[`${prop}.flipv`] = parseInt(result.parameters.FLIPV);
              if (result.parameters.hasOwnProperty('FLIPH'))
                statusobj[`${prop}.fliph`] = parseInt(result.parameters.FLIPH);
              if (result.parameters.hasOwnProperty('AUTOEXP_ON'))
                statusobj[`${prop}.autoexposure`] = parseInt(result.parameters.AUTOEXP_ON);
              if (result.parameters.hasOwnProperty('WB_EN'))
                statusobj[`${prop}.whitebalance`] = parseInt(result.parameters.WB_EN);
            }
            logger.log(`STREAMER: getCamSettings successful on ${this.cameraip} settings`);
            this.globalBus.emit('mcu.status', statusobj);
          } else if (err) {
            statusobj[prop] = -1;
            this.globalBus.emit('mcu.status', statusobj);
            logger.log(`STREAMER: getCamSettings response XML parsing error: ${err}`, { severity: ERROR });
          }
        });
      }
      if (err) {
        logger.log(`STREAMER: getCamSettings on camera ${this.cameraip} failed with error: ${err}`, { severity: ERROR });
      }
    });
  }

  qualilty(quality) {
    if (quality >= 60 && quality <= 100) {
      // Send command to camera
      if (this.cameraip === 'pilot')
        this.cameraip = process.env['EXTERNAL_CAM_IP'];
      request({
        timeout: 2000,
        uri: `http://${this.cameraip}/setparameters_demo.php?QUALITY=${quality}`
      }, function (err, response, body) {
        if (response && response.statusCode == 200) {
          logger.log(`STREAMER: Setting JPEG quality ${quality}% on camera ${this.cameraip}`);
          setTimeout(() => {
            this.cockpitBus.emit('plugin.elphel-config.getCamSettings', this.cameraip);
          }, 500);
          if (this.cameraMap.hasOwnProperty(cameraIp))
            this.cameraMap[cameraIp].quality = quality;
        }
        if (err) {
          logger.log(`STREAMER: Setting JPEG quality on camera ${this.cameraip} failed with error: ${err}`, { severity: WARN });
        }
      });
    } else {
      logger.log(`STREAMER: Invalid quality value ${quality}% for camera ${this.cameraip} - ignoring`, { severity: ERROR });
    }
  }

  record(record) {

  }

  resolution(resolution) {
    let valid = [1, 2, 4];
    if (valid.indexOf(resolution) > -1) {
      // Send command to camera
      if (this.cameraip === 'pilot')
        this.cameraip = process.env['EXTERNAL_CAM_IP'];
      request({
        timeout: 2000,
        uri: `http://${this.cameraip}/setparameters_demo.php?BIN_HOR=${resolution}&BIN_VERT=${resolution}&DCM_HOR=${resolution}&DCM_VERT=${resolution}`
      }, function (err, response, body) {
        if (response && response.statusCode == 200) {
          logger.log(`STREAMER: Set resolution 1/${resolution} on camera ${this.cameraip}`);
          setTimeout(() => {
            this.cockpitBus.emit('plugin.elphel-config.getCamSettings', this.cameraip);
          }, 500);
          if (this.cameraMap.hasOwnProperty(cameraIp))
            this.cameraMap[cameraIp].resolution = resolution;
        }
        if (err) {
          logger.log(`STREAMER: Setting resolution on camera ${this.cameraip} failed with error: ${err}`, { severity: WARN });
        }
      });
    } else {
      logger.log(`STREAMER: Invalid resolution value 1/${resolution} for camera ${this.cameraip} - ignoring`, { severity: ERROR });
    }
  }

  restart() {

  }

  snap() {
    let filename = new Date().toISOString();
    filename = filename.replace(/[\.\-T:]/g, '_').replace(/Z/, '');
    let ts;
    let id;
    // Send command to camera
    if (this.cameraip === 'pilot')
      this.cameraip = process.env['EXTERNAL_CAM_IP'];
    if (this.cameraMap.hasOwnProperty(cameraIp)) {
      ts = this.cameraMap[cameraIp].ts;
      id = this.cameraMap[cameraIp].id;
      // request() will follow redirects by default
      let url = `http://${this.cameraip}/snapfull.php`;
      request({
        timeout: 5000,
        uri: url,
        encoding: null
      }, function (err, response, body) {
        if (response && response.statusCode == 200) {
          logger.log(`STREAMER: Snapped full resolution image from camera ${this.cameraip}`);
          fs.writeFile(`/opt/openrov/images/${ts}/${id}/snap_${filename}.jpg`, body, 'binary', function (err) {
            logger.log(`STREAMER: Error trying to write snapFull request on camera ${this.cameraip} error: ${err}`, { severity: CRIT });
          });
        }
        if (err) {
          logger.log(`STREAMER: Getting full resolution snapshot on ${this.cameraip}  failed with error: ${err}`, { severity: CRIT });
        }
      });
    }
  }

  temp() {
    let onBoardTemp = 'i2c.php?width=8&bus=1&adr=0x4800';
    let subProp = 'unknown';
    // Send command to camera
    if (this.cameraip === 'pilot')
      this.cameraip = process.env['EXTERNAL_CAM_IP'];
    if (this.cameraMap.hasOwnProperty(cameraIp)) {
      subProp = cameraIp.split('.')[3];
    }
    let prop = `camera.${subProp}`;
    let statusobj = {};
    request({
      timeout: 2000,
      uri: `http://${this.cameraip}/${onBoardTemp}`
    }, function (err, response, body) {
      if (response && response.statusCode == 200) {
        parseString(body, function (err, result) {
          if (result) {
            logger.log(`STREAMER: Onboard temperature ${result.i2c.data} on camera ${this.cameraip}`);
            // Emit temperature (in degrees C) and camera ID to telemetry plugin
            statusobj[prop] = parseInt(result.i2c.data);
            this.globalBus.emit('mcu.status', statusobj);
          } else if (err) {
            statusobj[prop] = -1;
            this.globalBus.emit('mcu.status', statusobj);
            logger.log(`STREAMER: Onboard temperature response XML parsing error: ${err}`, { severity: ERROR });
          }
        });
      }
      if (err) {
        logger.log(`STREAMER: Getting onBoard temperature on camera ${this.cameraip} failed with error: ${err}`, { severity: ERROR });
      }
    });
  }

  whitebalance() {

  }

/*
  requestCamTemp() {
    for (let prop in this.cameraMap) {
      if (prop.match('820[0-9]') !== null)
        this.cockpitBus.emit('plugin.elphel-config.temp', this.cameraMap[prop].ipAddress);
    }
  }

  getCamSettings() {
    for (let prop in this.cameraMap) {
      if (prop.match('820[0-9]') !== null)
        this.cockpitBus.emit('plugin.elphel-config.getCamSettings', this.cameraMap[prop].ipAddress);
    }
  }*/
}

module.exports.ElphelDriver = ElphelDriver;