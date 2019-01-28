const request      = require('request');
const parseString  = require('xml2js').parseString;
const shared       = require('./shared');
const fs           = require('fs');
const logger       = shared.logger;
const ERROR        = shared.ERROR;
const WARN         = shared.WARN;
const DEBUG        = shared.DEBUG;

class ElphelDriver {
  constructor(cameraIp, location) {
    // Elphel 353 settings URI
    this.baseUri = `http://${cameraIp}/parsedit.php?immediate`;
    this.cameraip = cameraIp;
    this.location = location;
    this.ts = shared.get_ts();
    this.snap_count = 0;
    this.bootSettingsChanged = false;
    this.paramsMap = this.getParamsMap();
    this.camsettings = {} // stores last-known camera settings
    this.defaults = this.getDefaults(); // from env vars
    this.getCamSettings(); // try to get current camera settings on instantiation
  }

  autoexposure(autoexp) {
    if (autoexp == 0 || autoexp == 1) {
      this.httpRequest('autoexposure', autoexp, `&AUTOEXP_EN=${autoexp}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid autoexposure value ${autoexp} for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  color(color) {
    if (color === 1 || color === 5) {
      this.httpRequest('color', color, `&COLOR=${color}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid color value ${color} for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  exposure(exposure) {
    let newExposure;
    if (this.camsettings.hasOwnProperty(exposure) && (exposure === 1 || exposure === -1)) {
      newExposure = this.camsettings.exposure + exposure;
      this.httpRequest('exposure', exposure, `&EXPOS=${exposure*1000}`);
    }
    else if (exposure > 1 && exposure <= 2000) {
      newExposure = exposure;
      this.httpRequest('exposure', exposure, `&EXPOS=${exposure*1000}`);
    }
    else if (exposure > 2000) {
      newExposure = 2000;
      this.httpRequest('exposure', exposure, `&EXPOS=${exposure*1000}`);
    }
    else {
      // invalid setting requested
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid exposure value ${exposure}ms for camera ${this.cameraip} - ignoring`, ERROR);
      return;
    }
  }

  fliph(fliph) {
    if (fliph === 0 || fliph === 1) {
      this.httpRequest('fliph', fliph, `&FLIPH=${fliph}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid fliph value ${fliph} for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  flipv(flipv) {
    if (flipv === 0 || flipv === 1) {
      this.httpRequest('flipv', flipv, `&FLIPV=${flipv}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid flipv value ${flipv} for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  fps(fps) {
    let settingsUri;
    if (fps === 0) {
      // disabled
      settingsUri += '&FPSFLAGS=0';
      this.httpRequest('fps', fps, settingsUri);
    }
    else if (fps >= 1 && fps <= 30) {
      settingsUri += `&FP1000SLIM=${fps*1000}&FPSFLAGS=1`;
      this.httpRequest('fps', fps, settingsUri);
    }
    else {
      // invalid setting requested
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid fps value ${fps} for camera ${this.cameraip} - ignoring`, ERROR);
      return;
    }
  }

  // request current image settings from camera
  getCamSettings() {
    let settingsUri = this.baseUri + '&COLOR&EXPOS&QUALITY&DCM_HOR&FLIPV&FLIPH&AUTOEXP_ON&WB_EN&FPSLIM1000&FPSFLAGS';
    let obj = this.httpRequest('getCamSettings', 'NA', settingsUri);
    if (obj.hasOwnProperty('body')) {
      parseString(obj.body, function (err, result) {
        if (result) {
          if (result.hasOwnProperty('parameters')) {
            if (result.parameters.hasOwnProperty('COLOR'))
              this.camsettings.color = parseInt(result.parameters.COLOR);
            if (result.parameters.hasOwnProperty('EXPOS'))
              this.camsettings.exposure = parseInt(result.parameters.EXPOS)/1000; // ms
            if (result.parameters.hasOwnProperty('QUALITY'))
            this.camsettings.quality = parseInt(result.parameters.QUALITY);
            if (result.parameters.hasOwnProperty('DCM_HOR'))
              this.camsettings.resolution = parseInt(result.parameters.DCM_HOR);
            if (result.parameters.hasOwnProperty('FLIPV'))
              this.camsettings.flipv = parseInt(result.parameters.FLIPV);
            if (result.parameters.hasOwnProperty('FLIPH'))
              this.camsettings.fliph = parseInt(result.parameters.FLIPH);
            if (result.parameters.hasOwnProperty('AUTOEXP_ON'))
              this.camsettings.autoexposure = parseInt(result.parameters.AUTOEXP_ON);
            if (result.parameters.hasOwnProperty('WB_EN'))
              this.camsettings.whitebalance = parseInt(result.parameters.WB_EN);
            if (result.parameters.hasOwnProperty('FPSLIM1000'))
              this.camsettings.fps = parseInt(result.parameters.FPSLIM1000)/1000;
            if (result.parameters.hasOwnProperty('FPSFLAGS'))
              this.camsettings.fps_en = parseInt(result.parameters.FPSFLAGS);
          }
          logger.log(`CAMERA-CONFIG-${this.location}: getCamSettings successful on ${this.cameraip} settings`);
        }
        if (err) {
          logger.log(`CAMERA-CONFIG-${this.location}: getCamSettings response XML parsing error: ${err}`, ERROR);
        }
      });
    }
  }

  // return object with last-known camera settings but don't poll device
  getLastSettings() {
    return this.camsettings;
  }

  quality(quality) {
    if (quality >= 60 && quality <= 100) {
      this.httpRequest('quality', quality, `&QUALITY=${quality}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid quality value ${quality}% for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  resolution(resolution) {
    let valid = [1, 2, 4];
    if (valid.indexOf(resolution) > -1) {
      this.httpRequest('resolution', resolution, `&BIN_HOR=${resolution}&BIN_VERT=${resolution}&DCM_HOR=${resolution}&DCM_VERT=${resolution}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid resolution value 1/${resolution} for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  snap() {
    let filename = new Date().toISOString();
    filename = filename.replace(/[\.\-T:]/g, '_').replace(/Z/, '');
    // request() will follow redirects by default
    let url = `http://${this.cameraip}/snapfull.php`;
    request({
      timeout: 5000,
      uri: url,
      encoding: null
    }, function (err, response, body) {
      if (response && response.statusCode == 200) {
        logger.log(`CAMERA-CONFIG-${this.location}: Snapped full resolution image from camera ${this.cameraip}`);
        fs.writeFile(`/srv/scini/images/${this.ts}/${this.location}/snap_${filename}.jpg`, body, 'binary', (err) => {
          if (err) {
            logger.log(`CAMERA-CONFIG-${this.location}: Error trying to save full resolution snapshot from camera ${this.cameraip} error: ${err}`, CRIT);
          }
          else {
            this.snap_count += 1;
          }
        });
      }
      if (err) {
        logger.log(`CAMERA-CONFIG-${this.location}: Getting full resolution snapshot on ${this.cameraip} failed with error: ${err}`, CRIT);
      }
    });
  }

  temp() {
    let onBoardTemp = 'i2c.php?width=8&bus=1&adr=0x4800';
    request({
      timeout: 2000,
      uri: `http://${this.cameraip}/${onBoardTemp}`
    }, function (err, response, body) {
      if (response && response.statusCode == 200) {
        parseString(body, function (err, result) {
          if (result) {
            this.camsettings.temp = parseInt(result.i2c.data);
            logger.log(`CAMERA-CONFIG-${this.location}: Onboard temperature ${result.i2c.data} on camera ${this.cameraip}`);
            // Emit temperature (in degrees C) and camera ID to telemetry plugin
          } else if (err) {
            logger.log(`CAMERA-CONFIG-${this.location}: Onboard temperature response XML parsing error: ${err}`, ERROR);
          }
        });
      }
      if (err) {
        logger.log(`CAMERA-CONFIG-${this.location}: Getting onBoard temperature on camera ${this.cameraip} failed with error: ${err}`, ERROR);
      }
    });
  }

  whitebalance(whitebalance) {
    if (whitebalance === 0 || whitebalance === 1) {
      this.httpRequest('whitebalance', whitebalance, `&WB_EN=${whitebalance}`);
    }
    else {
      logger.log(`CAMERA-CONFIG-${this.location}: Invalid whitebalance value ${whitebalance} for camera ${this.cameraip} - ignoring`, ERROR);
    }
  }

  getDefaults() {
    let ae, color, exp, fh, fv, fps, fps_en, qual, res, wb;
    if (process.env.AUTOEXP_ON === '1' || process.env.AUTOEXP_ON === 'true' ) {
      ae = 1;
    }
    else {
      ae = 0;
    }
    if (process.env.COLOR === '1' || process.env.COLOR === '5') {
      color = parseInt(process.env.COLOR);
    }
    else {
      color = 1;
    }
    let e = parseInt(process.env.EXPOS);
    if (e >= 1 && e <= 2000) {
      exp = e;
    }
    else {
      exp = 30;
    }
    if (process.env.FLIPH === '0' || process.env.FLIPH === '1' ) {
      fh = parseInt(process.env.FLIPH);
    }
    else if (process.env.FLIPH === 'true') {
      fh = 1;
    }
    else {
      fh = 0;
    }
    if (process.env.FLIPV === '0' || process.env.FLIPV === '1' ) {
      fv = process.env.FLIPV;
    }
    else if (process.env.FLIPV === 'true') {
      fv = 1;
    }
    else {
      fv = 0;
    }
    let f = parseInt(process.env.FPS);
    if (f >= 1 && f <= 30) {
      fps = f;
      fps_en = 1;
    }
    else {
      fps = 0;
      fps_en = 0;
    }
    let q = parseInt(process.env.QUALITY);
    if (q >= 65 && q <= 100) {
      qual = q;
    }
    else {
      qual = 70;
    }
    if (process.env.RESOLUTION === '1' || process.env.RESOLUTION === '2' || process.env.RESOLUTION === '4') {
      res = process.env.RESOLUTION;
    }
    else {
      res = 4;
    }
    if (process.env.WB_EN === '0' || process.env.WB_EN === 'false') {
      wb = 0;
    }
    else {
      wb = 1;
    }

    let obj = {
      autoexposure: ae,
      color: color,
      exposure: exp,
      fliph: fh,
      flipv: fv,
      fps: fps,
      fps_en: fps_en,
      quality: qual,
      resolution: res,
      whitebalance: wb,
    };

    let obj_s = JSON.stringify(obj);
    logger.log(`CAMERA-CONFIG-${this.location}: getDefaults() for camera ${this.cameraip} are: ${obj_s}`);
    return obj;
  }

  getParamsMap() {
    return {
      autoexposure: 'AUTOEXP_ON',
      color: 'COLOR',
      exposure: 'EXPOS',
      fliph: 'FLIPH',
      flipv: 'FLIPV',
      fps: 'FPSLIM1000',
      quality: 'QUALITY',
      resolution: ['BIN_HOR', 'BIN_VERT', 'DCM_HOR', 'DCM_VERT'],
      whitebalance: 'WB_EN',
    }
  }

  // attempt to reset camera to configured defaults from env vars
  setCamera(group) {
    let settings = {};
    if (group === 'defaults') {
      settings = this.defaults;
    }
    else if (group === 'last') {
      settings = this.camsettings;
    }
    else {
      return false;
    }
    let requestUri = this.baseUri;
    Object.keys(settings).forEach(function(key) {
      let param = this.paramsMap[key];
      let val = settings[key];
      requestUri += `&${param}=${val}`;
    });
    request({
      timeout: 2000,
      uri: requestUri
    }, function (err, response, body) {
      if (response && response.statusCode == 200) {
        logger.log(`CAMERA-CONFIG-${this.location}: Setting ${group} on camera ${this.cameraip} successful`);
        Object.keys(settings).forEach(function(key) {
          this.camsettings[key] = settings[key];
          this.bootSettingsChanged = true;
        });
      }
      if (err) {
        logger.log(`CAMERA-CONFIG-${this.location}: Setting ${group} on camera ${this.cameraip} failed with error: ${err}`, ERROR);
      }
    });
  }

  httpRequest(key, value, params) {
    let ret;
    let requestUri = this.baseUri + params;
    request({
      timeout: 2000,
      uri: requestUri
    }, function (err, response, body) {
      if (err) {
        logger.log(`CAMERA-CONFIG-${this.location}: Setting ${key} to ${value} on camera ${this.cameraip} failed with error: ${err}`, WARN);
        ret = { success: false };
      }
      else if (response && response.statusCode == 200) {
        if (key === 'fps') {
          if (value > 0) {
            this.camsettings.fps_en = 1;
          }
          else if (value === 0) {
            this.camsettings.fps_en = 0;
          }
        }
        this.camsettings[key] = value;
        this.bootSettingsChanged = true; // stop sending defaults on connect/reboot
        logger.log(`CAMERA-CONFIG-${this.location}: Set ${key} to ${value} on camera ${this.cameraip}`);

        ret = { success: true, body: body };
      }
    });
    return ret;
  }
}

module.exports.ElphelDriver = ElphelDriver;