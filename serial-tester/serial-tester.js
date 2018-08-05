#!/root/.nvm/versions/node/v8.11.2/bin/node --inspect

const pro4 = require('./pro4');
const SerialPort = require('serialport');
const logger = require('pino')();
const EventEmitter = require('events');

logger.level = 'debug';

let mockNodeIds = [];
if (process.env.hasOwnProperty('NODEIDS'))
{
  mockNodeIds = process.env['NODEIDS'].split(' ');
  for (let i = 0; i < mockNodeIds.length; i++)
  {
    mockNodeIds[i] = +mockNodeIds[i]; // convert string to int
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
    this.on('parsedPacket', function(parsedObj) {
      logger.debug('SUP parsed packet: ', parsedObj);
      this.sendUpstream(parsedObj);
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
        pro4Addresses:  [0x31,0x32,0x33,0x41,0x42,0x43],
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
        pro4Addresses:  [64], // all updated at same time
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
          nodeId:       0x27,  // PRO4 packet ID
          state:        0      // 0 (stop), 2 (close), 3 (open)
        },
        {
          name:         "Gripper 2 - water sampler",
          nodeId:       0x62,   // PRO4 packet ID
          state:        0       // 0 (stop), 2 (close), 3 (open)
        },
        {
          name:         "Gripper 3 - trim",
          nodeId:       0x63,  // PRO4 packet ID
          state:        0      // 0 (stop), 2 (close), 3 (open)
        }
      ],
      pro4:             {
        pro4Sync:       pro4.constants.SYNC_REQUEST8LE,
        pro4Addresses:  [0x61, 0x62, 0x63], // all updated at same time
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
      current: 0,
      temp: 0,
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
      bus_v: 0,
      bus_i: 0,
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
      rpm: 0,
      bus_v: 0,
      bus_i: 0,
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

    let ret = {
      scni: 'SCNI',
      len: 0,
      cmd: 0,
      servo1: 0,
      servo2: 0,
      gpioOut: 0,
      gpioIn: 0,
      acs764: [0, 0, 0, 0],
      tmp102: [0, 0, 0, 0],
      adcKelvin: [0, 0],
      adcVolts: [0, 0, 0],
      adc48v: 0,
      adc24v: 0,
      adc12v: 0,
      kellerTemperature: 0,
      kellerPressure: 0,
      kellerStatus: 0,
      pad: 0,
      accel_x: 0,
      accel_y: 0,
      accel_z: 0,
      angle_x: 0,
      angle_y: 39,
      angle_z: 0,
      rot_x: 0,
      rot_y: 0,
      rot_z: 0
    }
    return {h: header, payload: scini.parser.ParserBam.encode(ret)};
  }

  updateSensors(parsedObj)
  {
    let header = {};
    header.sync = pro4.constants.SYNC_RESPONSE8BE;
    header.id = parsedObj.id;
    header.flags = parsedObj.flags;
    header.csrAddress = parsedObj.csrAddress;

    let ret = {
      scni: 'SCNI',
      len: 0,
      cmd: 0,
      servo1: 0,
      servo2: 0,
      gpioOut: 0,
      gpioIn: 0,
      acs764: [0, 0, 0, 0],
      tmp102: [0, 0, 0, 0],
      adcKelvin: [0, 0],
      adcVolts: [0, 0, 0],
      adc48v: 0,
      adc24v: 0,
      adc12v: 0,
      kellerTemperature: 0,
      kellerPressure: 0,
      kellerStatus: 0,
      pad: 0,
      accel_x: 0,
      accel_y: 0,
      accel_z: 0,
      angle_x: 0,
      angle_y: 39,
      angle_z: 0,
      rot_x: 0,
      rot_y: 0,
      rot_z: 0
    }
    return {h: header, payload: scini.parser.ParserBam.encode(ret)};
  }

  async sendUpstream(parsedObj)
  {
    let resp = {};
    if (parsedObj.status == pro4.constants.STATUS_SUCCESS)
    {
      let funcMap = {
        pilot: scini.updateNav,
        sensors: scini.updateSensors,
        lights: scini.updateLights,
        motors: scini.updateMotors,
        grippers: scini.updateGrippers
      }

      if (funcMap.hasOwnProperty(parsedObj.type))
      {
        try
        {
          resp = await funcMap[parsedObj.type](parsedObj);
          // get final packet to return
          let packetBuf = await scini.parser.encode(resp.h.sync, resp.h.id, resp.h.flags, resp.h.csrAddress, resp.payload.length, resp.payload);
          port.write(packetBuf, function(err) {
            if (err) {
              return logger.debug('Error on write: ', err.message);
            }
          });
        }
        catch(e)
        {
          logger.debug('BRIDGE: Payload parsing error = ', e.message, '; obj = ', parsedObj);
          parsedObj.status = pro4.constants.STATUS_ERROR;
        }
      }
    }
    else if (parsedObj.status == pro4.constants.STATUS_MOREDATA)
    {
      logger.debug('BRIDGE: Waiting for more data');
    }

    // don't use else if to support fall through changing status conditions during processing
    if (parsedObj.status == pro4.constants.STATUS_ERROR)
    {
      logger.debug('BRIDGE: Error in PRO4 message parser; data = ', parsedObj.data.toString('hex'));
    }

    // well, kinda ugly for now but this needs to get done
    // invalid status
    if ([pro4.constants.STATUS_ERROR,pro4.constants.STATUS_MOREDATA,pro4.constants.STATUS_SUCCESS].indexOf(parsedObj.status) === -1)
    {
      logger.debug('BRIDGE: Invalid PRO4 parser status = ', parsedObj.status);
    }
  };

} // end class serialTester

const scini = new serialTester();
const port = new SerialPort(process.env.PTY, {
  baudRate: 115200
});

// Open errors will be emitted as an error event
port.on('error', (e) => {
  logger.debug('SERIAL: Error = ', e.message);
  process.exit(1);
});

// Switches the port into "flowing mode"
port.on('data', (data) => {
  scini.parser.emit('receivedSerialData', data);
});

/*
with open('/testbam.pro4') as f:
content = f.readlines()
content = [x.strip() for x in content]
worker(content)

let scini = new serialTester();
let file = fs.readFile(process.env.PTY);

    serfd = os.open(os.environ['PTY'], os.O_RDWR | os.O_NONBLOCK)
    r = []
    timeout = 1

    while True:
        try:
            r, w, e = select.select([serfd],[],[], timeout)
        except:
            pass
        if r:
            data = os.read(serfd,255)
            print('PRO4 request received = ', data.hex())
            num = random.randint(0, len(content)-1)
            msg = content[num]
            os.write(serfd, bytes.fromhex(msg))
            print('PRO4 response sent = ', msg)

            # Test CT sensor
#test = struct.pack('13s2B', '01:#059;57600', 0x0d, 0x0a)
#test = struct.pack('7s2B', '01:#030', 0x0d, 0x0a)
*/
