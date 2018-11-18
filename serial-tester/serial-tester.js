#!/root/.nvm/versions/node/v8.12.0/bin/node --inspect=9222

const pro4 = require('./pro4');
const logger = require('pino')();
const EventEmitter = require('events');

logger.level = 'fatal';

let filterList = [];
if (process.env.hasOwnProperty('NODEIDS'))
{
  filterList = process.env['NODEIDS'].split(/\s+/);
  for (let i = 0; i < filterList.length; i++)
  {
    filterList[i] = +filterList[i]; // convert string to int
  }
}
else
{
  logger.debug('Missing space separated list of NODEIDS in environment variable');
  logger.debug('Example: export NODEIDS="14 15 16"');
  logger.debug('Exiting...');
  process.exit(1);
}

class serialTester extends EventEmitter
{
  constructor()
  {
    super();
    this.client = {};

    // event listeners
    this.on('error', (e) => {
      logger.debug('Error: ', e.message);
    });
    // only called on requests from MQTT to subscribed topics
    // filter out PRO4 IDs not in process.env['NODEIDS']
    this.on('parsedPacket', function(parsedObj) {
      if (filterList.indexOf(parsedObj.id) !== -1) {
        this.sendUpstream(parsedObj);
      }
    });

    // *********** SCINI specific platform hardware request state *************
    this.sensors = {
      time:             0,
      timeDelta_ms:     0,
      updateInterval:   1000,       // loop interval in ms
      ps:               {           // power supply
        brdvRampUp:   true,
        brdv:         5.0,
        vout:         5.0,
        iout:         2.0,
        bt1i:         0.0,
        bt2i:         0.0,
        baro_p:       0,
        baro_t:       0.0
      },
      imu:              {
        mode:         0,            // 0: GYRO, 1:MAG
        roll:         0,
        rollOffset:   0,
        pitch:        0,
        pitchOffset:  0,
        yaw:          0,
        yawOffset:    0,
        heading:      0
      },
      depth:            {
        waterType:    0,            // 0: Fresh, 1: Salt
        depth:        0,
        depthOffset:  0,
        temp:  0,
        pressure:     0
      },
      barometer:        {           // XXX - do we need this?
        temp:         0,
        pressure:     0
      },
      pro4:             {
        pro4Sync:       pro4.constants.SYNC_REQUEST8LE,
        pro4Addresses:  [42, 51, 52],
        flags:          0x00,       // or 0x80
        csrAddress:     0xf0,       // custom command address
        lenNoop:        6,          // no write, just read all values
        lenBam:         11,         // send write to control servos, GPIOs
        payloadHeader:  0x53434e49, // "SCNI" - beginning of request payloads
        payloadLenNoop: 2,          // no write, just read all values
        payloadLenBam:  7,          // send write to control servos, GPIOs
        payloadCmdNoop: 0,          // no write, just read all values
        payloadCmdBam:  0x02,       // send write to control servos, GPIOs
        payloadServo1:  0x0000,     // 2 byte servo 1 angle
        payloadServo2:  0x0000,     // 2 byte servo 2 angle
        payloadGpio:    0x00,       // 1 byte output bits
        noopPayload:    new Buffer.allocUnsafe(6),  // value should equal lenNoop
        bamPayload:     new Buffer.allocUnsafe(11)  // value should equal lenBam
      }
    }
    this.sensors.pro4.noopPayload.writeUInt32BE(this.sensors.pro4.payloadHeader, 0);   // "SCNI"
    this.sensors.pro4.noopPayload.writeUInt8(this.sensors.pro4.payloadLenNoop, 4);     // payload len
    this.sensors.pro4.noopPayload.writeUInt8(this.sensors.pro4.payloadCmdNoop, 5);     // payload cmd
    this.sensors.pro4.bamPayload.writeUInt32BE(this.sensors.pro4.payloadHeader, 0);    // "SCNI"
    this.sensors.pro4.bamPayload.writeUInt8(this.sensors.pro4.payloadLenBam, 4);       // payload len
    this.sensors.pro4.bamPayload.writeUInt8(this.sensors.pro4.payloadCmdBam, 5);       // payload cmd

    this.clumpLights = {
      time:             0,
      timeDelta_ms:     0,
      updateInterval:   700,        // loop interval in ms
      power:            0,          // 0 to 1
      pro4:             {
        pro4Sync:       pro4.constants.SYNC_REQUEST32LE,
        pro4Addresses:  [65, 66], // all updated at same time
        flags:          2,          // defined by VideoRay
        csrAddress:     0,          // custom command address
        len:            4 * 3       // 3 led banks
      }
    }

    this.vehicleLights = {
      time:             0,
      timeDelta_ms:     0,
      updateInterval:   700,        // loop interval in ms
      power:            0,          // 0 to 1
      pro4:             {
        pro4Sync:       pro4.constants.SYNC_REQUEST32LE,
        pro4Addresses:  [61, 62, 63], // all updated at same time - note these are NOT hex addresses
        flags:          2,          // defined by VideoRay
        csrAddress:     0,          // custom command address
        len:            4 * 3       // 3 led banks
      }
    }

    // This loop should only emit data on the bus if the
    // pilot requests action
    // payload first 2 bytes = 0x3549
    // valid values: open = 3 close = 2 stationary = 0
    this.gripperControl = {
      time:             0,
      timeDelta_ms:     0,
      updateInterval:   500,  // loop interval in ms
      grippers:         [
        {
          name:         "Gripper 1",
          nodeId:       24,  // PRO4 packet ID
          state:        0      // 0 (stop), 2 (close), 3 (open)
        },
        {
          name:         "Gripper 2 - water sampler",
          nodeId:       23,   // PRO4 packet ID
          state:        0       // 0 (stop), 2 (close), 3 (open)
        },
        {
          name:         "Gripper 3 - trim",
          nodeId:       21,  // PRO4 packet ID
          state:        0      // 0 (stop), 2 (close), 3 (open)
        }
      ],
      pro4:             {
        pro4Sync:       pro4.constants.SYNC_REQUEST8LE,
        pro4Addresses:  [24, 23, 21], // all updated at same time
        flags:          0x80,  // defined by VideoRay
        csrAddress:     0,     // custom command address
        len:            1      // command payload is just a single byte
      }
    }

    // Multicast motor control is the preferred method of operation to reduce
    // serial contention and latency
    //
    // motors array of objects description
    // name = common name of motor position on vehicle
    // nodeId = PRO4 header node ID
    // motorId = part of device protocol payload, used in PRO4 multicast packets
    //           to control individual motor values in packet addressed to multiple
    //           devices starts at 0 indicating first payload value
    //
    this.motorControl = {
      time:             0,
      timeDelta_ms:     0,
      updateInterval:   100,    // loop interval in ms
      rotateInterval:   5000,   // rotate motor responder every 5 seconds
      responderIdx:     0,      // motor array index that will respond to requests
      motors:           [
        {
          name:         "aft vertical",
          nodeId:       12,     // PRO4 packet ID
          motorId:      0,      // device protocol ID, position in PRO4 payload
          value:        0,      // thrust value (-1 to +1)
          reverse:      false,  // boolean
          fwdMod:       1.0,    // final forward thrust modifier
          revMod:       1.0     // final reverse thrust modifier
        },
        {
          name:         "aft horizontal",
          nodeId:       13,     // PRO4 packet IDar
          motorId:      1,      // device protocol ID, position in PRO4 payload
          value:        0,      // thrust value (-1 to +1)
          reverse:      false,  // boolean
          fwdMod:       1.0,    // final forward thrust modifier
          revMod:       1.0     // final reverse thrust modifier
        },
        {
          name:         "fore vertical",
          nodeId:       14,     // PRO4 packet ID
          motorId:      2,      // device protocol ID, position in PRO4 payload
          value:        0,      // thrust value (-1 to +1)
          reverse:      false,  // boolean
          fwdMod:       1.0,    // final forward thrust modifier
          revMod:       1.0     // final reverse thrust modifier
        },
        {
          name:         "fore horizontal",
          nodeId:       15,     // PRO4 packet ID
          motorId:      3,      // device protocol ID, position in PRO4 payload
          value:        0,      // thrust value (-1 to +1)
          reverse:      false,  // boolean
          fwdMod:       1.0,    // final forward thrust modifier
          revMod:       1.0     // final reverse thrust modifier
        },
        {
          name:         "thruster",
          nodeId:       16,     // PRO4 packet ID
          motorId:      4,      // device protocol ID, position in PRO4 payload
          value:        0,      // thrust value (-1 to +1)
          reverse:      false,  // boolean
          fwdMod:       1.0,    // final forward thrust modifier
          revMod:       1.0     // final reverse thrust modifier
        }
      ],
      pro4:             {
        pro4Sync:       pro4.constants.SYNC_REQUEST32LE,
        pro4Addresses:  [129],  // 129, multicast, see motors array above
        //pro4Addresses:  [12, 13, 14, 15, 16],  // 129, multicast, see motors array above
        flags:          2,      // defined by VideoRay
        csrAddress:     0xf0,   // custom command address
        len:            2+4*5,   // 2 command bytes + 4 byte float * number of motors
        payloadCmd:     0xaa   // defined by VideoRay
      }
    }

    // pass length of motors array for dynamic parser length field
    this.parser = new pro4.Pro4(this.motorControl.motors.length, this);

    // used for simulated device data
    this.rand = 0.213;
    this.randomInterval = setInterval( () => { this.rand = Math.random(); }, 100);
    this.tempIdx = 0;
    this.tiltIdx = 0;
    this.pressure = 10;
    this.pressureInc = 0.1;
  }

  updateGrippers(parsedObj)
  {
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE8BE;
    header.id = parsedObj.id;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    let ret = {
      cmd: 0,
      cmdStatus: 0,
      lim_i: 0,
      current: (scini.rand * 5.0 + 1.0).toFixed(2),
      temp: (scini.rand * 3.0 + 35.0).toFixed(2),
      devAddress: 0,
      firmwareVersion: 0
    }
    return {h: header, payload: scini.parser.ParserGrippers.encode(ret)};
  }

  updateLights(parsedObj)
  {
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE32BE;
    header.id = parsedObj.id;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    let ret = {
      deviceType: 0,
      bus_v: (scini.rand * (48.3 - 48.0) + 48.0).toFixed(2),
      bus_i: (scini.rand * (1.58 - 0.1) + 0.1).toFixed(2),
      fault: 0
    }
    return {h: header, payload: scini.parser.ParserLights.encode(ret)};
  }

  updateMotors(parsedObj)
  {
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE32BE;
    header.id = parsedObj.device.responderIdx;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    let ret = {
      deviceType: 0,
      rpm: (scini.rand * (2000.0 - 50.0) + 50.0).toFixed(2),
      bus_v: (scini.rand * (48.3 - 48.0) + 48.0).toFixed(2),
      bus_i: (scini.rand * (1.58 - 0.1) + 0.1).toFixed(2),
      fault: 0
    }
    return {h: header, payload: scini.parser.ParserMotors.encode(ret)};
  }

  // handles IMU calculations and sending sensor data to cockpit
  updateNav(parsedObj)
  {
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE8BE;
    header.id = parsedObj.id;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    let wave = [1.4,1.3,1.2,1.1,1.0,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0,-0.1,-0.2,-0.3,-0.4,-0.5,-0.6,-0.7,-0.8,-0.9,-1.0,-1.1,-1.2,-1.3,-1.4];
    let tilt = Math.sin(wave[scini.tiltIdx])*180/Math.PI;
    if (parsedObj.id == 52) {
      if (scini.tiltIdx == wave.length-1)
      {
        scini.tiltIdx = 0;
      }
      else
        scini.tiltIdx++;
    }

    let ret = {
      scni: 'SCNI',
      len: 80,
      cmd: 0,
      servo1: 0,
      servo2: 0,
      gpioOut: 0,
      gpioIn: 0,
      acs764: [scini.rand + 5.0, scini.rand + 5.0, scini.rand + 5.0, scini.rand + 5.0],
      tmp102: [scini.rand + 50.0, scini.rand + 50.0, scini.rand + 50.0, scini.rand + 50.0],
      adcKelvin: [scini.rand + 500.0, scini.rand + 500.0],
      adcVolts: [scini.rand + 48.0, scini.rand + 48.0, scini.rand + 48.0],
      adc48v: scini.rand + 48.0,
      adc24v: scini.rand + 24.0,
      adc12v: scini.rand + 12.0,
      kellerTemperature: scini.rand + 50.0,
      kellerPressure: scini.rand + 8.0,
      kellerStatus: 64,
      pad: 0,
      accel_x: 0,
      accel_y: 0,
      accel_z: 0,
      angle_x: tilt.toFixed(0),
      angle_y: tilt.toFixed(0),
      angle_z: 0,
      rot_x: 0,
      rot_y: 0,
      rot_z: 0,
      uptimeMillis: (scini.rand * 16384 + 16384).toFixed(0),
      imuPressure: (scini.rand * 16384 + 16384).toFixed(0),
      imuTemp: (scini.rand * 16384 + 16384).toFixed(0)
    }
    return {h: header, payload: scini.parser.ParserBam.encode(ret)};
  }

  updateKeller(parsedObj)
  {
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE8BE;
    header.id = parsedObj.id;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    // update pressure mock value
    // change to match sensor quantities - currently bar;
    let pressureMin = 10;
    let pressureMax = 150;
    if (scini.pressure === pressureMin)
      scini.pressureInc = 0.1;
    else if (scini.pressure === pressureMax)
      scini.pressureInc = -0.1;
    else if (scini.pressure < pressureMin || scini.pressure > pressureMax) { // error
      scini.pressureInc = 0.1;
      scini.pressure = 10;
    }
    scini.pressure += scini.pressureInc;

    let wave = [1.4,1.3,1.2,1.1,1.0,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0,-0.1,-0.2,-0.3,-0.4,-0.5,-0.6,-0.7,-0.8,-0.9,-1.0,-1.1,-1.2,-1.3,-1.4];
    if (scini.tempIdx == wave.length-1)
    {
      scini.tempIdx = 0;
    }
    else
      scini.tempIdx++;

    let ret = {
      cmd: 4,
      uptime: 0,
      status: 0x40,
      pressure: scini.pressure,
      temp: wave[scini.tempIdx]
    }
    return {h: header, payload: scini.parser.ParserKeller.encode(ret)};
  }

  updateBoard44(parsedObj)
  {
    let ret;
    let retObj;
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE8BE;
    header.id = parsedObj.id;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    // Simulate CT sensor response
    let counter = (scini.rand * 32768 + 32768).toFixed(0);
    let temp = (scini.rand * 3.0).toFixed(3);
    let conductivity = (scini.rand * 2.0 + 49.0).toFixed(3); // device unit is mS/cm
    if (parsedObj.device.cmd === 3) {
      ret = {
        cmd: 3,
        ct: `${counter}\t${temp}\t${conductivity}\r\n`
      };
      retObj = {h: header, payload: scini.parser.ParserCtsensor.encode(ret)};
    }
    // Simulate Keller response
    else if (parsedObj.device.cmd === 4) {
      // update pressure mock value
      // change to match sensor quantities - currently bar;
      let pressureMin = 10;
      let pressureMax = 150;
      if (scini.pressure === pressureMin)
        scini.pressureInc = 0.1;
      else if (scini.pressure === pressureMax)
        scini.pressureInc = -0.1;
      else if (scini.pressure < pressureMin || scini.pressure > pressureMax) { // error
        scini.pressureInc = 0.1;
        scini.pressure = 10;
      }
      scini.pressure += scini.pressureInc;

      let wave = [1.4,1.3,1.2,1.1,1.0,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0,-0.1,-0.2,-0.3,-0.4,-0.5,-0.6,-0.7,-0.8,-0.9,-1.0,-1.1,-1.2,-1.3,-1.4];
      if (scini.tempIdx == wave.length-1)
      {
        scini.tempIdx = 0;
      }
      else
        scini.tempIdx++;
      ret = {
        cmd: 4,
        uptime: 0,
        status: 0x40,
        pressure: scini.pressure,
        temp: wave[scini.tempIdx]
      };
      retObj = {h: header, payload: scini.parser.ParserKeller.encode(ret)};
    }
    // board44 BAM
    else if (parsedObj.device.cmd === 6) {
      ret = {
        cmd: 6,
        uptime: 0,
        status: 0x40,
        pressure: scini.rand + 8.0,
        minPressure: 1.0,
        maxPressure: 10.0,
        kellerCust0: scini.rand,
        kellerCust1: scini.rand,
        kellerScale0: scini.rand + 3.0,
        acs764n1: scini.rand * 0.3 + 48.0,
        acs764n2: scini.rand * 0.3 + 12.0,
        acs764n3: scini.rand * 0.6 + 48.0,
        acs764n4: scini.rand * 0.3 + 24.0,
        adc0: scini.rand * 0.3 + 5.0,  // not used
        adc1: scini.rand + 3.0,        // temp K/100 on 24v PS side
        adc2: scini.rand * 0.3 + 5.0,
        adc3: scini.rand * 0.3 + 5.0,  // not used
        adc4: scini.rand * 0.3 + 48.0,
        adc5: scini.rand * 0.3 + 24.0,
        adc6: scini.rand * 0.3 + 12.0,
        adc7: scini.rand * 0.3 + 3.0   // temp K/100 on 12v PS side
      };
      retObj = {h: header, payload: scini.parser.ParserBoard44Bam.encode(ret)};
    }
    return retObj;
  }

  async sendUpstream(parsedObj)
  {
    let resp = {};
    if (parsedObj.status === pro4.constants.STATUS_SUCCESS)
    {
      let funcMap = {
        pilot: scini.updateNav,
        sensors: scini.updateNav,
        lights: scini.updateLights,
        motors: scini.updateMotors,
        gripper: scini.updateGrippers,
        waterSampler: scini.updateGrippers,
        trim: scini.updateGrippers,
        keller: scini.updateKeller,
        board44: scini.updateBoard44
      }

      if (funcMap.hasOwnProperty(parsedObj.type))
      {
        try
        {
          resp = funcMap[parsedObj.type](parsedObj);
          // get final packet to return
          let packetBuf = await scini.parser.encode(resp.h.sync, resp.h.id, resp.h.flags, resp.h.csrAddress, resp.payload.length, resp.payload);
          if (process.env.STANDALONE === 'true') {
            scini.parser.parseBuf.writeBuffer(packetBuf);
            let respObj = await scini.parser.parse(packetBuf.length, true);
            console.log(`sync1 = ${respObj.sync1}, sync2= ${respObj.sync2}, id = ${respObj.id}, flags = ${respObj.flags}, csr = ${respObj.csrAddress}, len = ${respObj.payloadLen}, crcHead = ${respObj.crcHead}, crcTotal = ${respObj.crcTotal}, type = ${respObj.type}`);
            console.dir(respObj.device);
          }
          else {
            // simulate variable embedded response delays
            // plus base delay of 5ms
            // small chance of splitting packetBuf into 2 parts before sending
            if (Math.random() < 0.04) {
              let l = Math.floor(packetBuf.length/2);
              let buf1 = packetBuf.slice(0, l);
              let buf2 = packetBuf.slice(l, packetBuf.length);
              setTimeout(process.stdout.write(buf1, function(err) {
                if (err) {
                  return logger.debug('Error on write: ', err.message);
                }
                else {
                  // write remaining packetBuf with another base delay
                  setTimeout(process.stdout.write(buf2, function(err) {
                    if (err) {
                      return logger.debug('Error on write: ', err.message);
                    }
                  }), Math.random() + 5);
                }
              }), Math.random()*70 + 5);
            }
            else {
              // send in one packet
              setTimeout(process.stdout.write(packetBuf, function(err) {
                if (err) {
                  return logger.debug('Error on write: ', err.message);
                }
              }), Math.random()*70 + 5);
            }

          }
        }
        catch(e)
        {
          logger.debug('SERIAL: Payload parsing error = ', e.message);
          logger.debug(e.stack);
          parsedObj.status = pro4.constants.STATUS_ERROR;
        }
      }
    }
    else if (parsedObj.status === pro4.constants.STATUS_MOREDATA)
    {
      logger.debug('SERIAL: Waiting for more data');
    }

    // don't use else if to support fall through changing status conditions during processing
    if (parsedObj.status === pro4.constants.STATUS_ERROR)
    {
      logger.debug('SERIAL: Error in PRO4 message parser; data = ', parsedObj.toString('hex'));
    }

    // well, kinda ugly for now but this needs to get done
    // invalid status
    if ([pro4.constants.STATUS_ERROR,pro4.constants.STATUS_MOREDATA,pro4.constants.STATUS_SUCCESS].indexOf(parsedObj.status) === -1)
    {
      logger.debug('SERIAL: Invalid PRO4 parser status = ', parsedObj.status);
    }
  };

} // end class serialTester

const scini = new serialTester();

// if STANDALONE='true', accept a hex string on stdin, process that and
// send it through parsing for easier troubleshooting than inside container
if (process.env.STANDALONE === 'true') {
  logger.debug('SERIAL: Running in standalone mode');
  process.stdin.pipe(require('split')());
}

// Open errors will be emitted as an error event
process.stdin.on('error', (e) => {
  logger.debug('SERIAL: Error = ', e.message);
  process.exit(1);
});

process.stdin.on('data', (data) => {
  if (process.env.STANDALONE === 'true') {
    data = Buffer.from(data.toString('utf8'), 'hex');
  }
  scini.parser.emit('receivedSerialData', data);
});
