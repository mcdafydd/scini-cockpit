/*
   COPYRIGHT (C) David McPike

   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions are met:

   * Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.

   * Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in
     the documentation and/or other materials provided with the
     distribution.

   * Neither the name of the copyright holders nor the names of
     contributors may be used to endorse or promote products derived
     from this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
  POSSIBILITY OF SUCH DAMAGE.
*/

const Parser        = require('binary-parser-encoder').Parser;
const StateMachine  = require('javascript-state-machine');
const CRC           = require('crc');
const EventEmitter  = require('events');
const SmartBuffer   = require('smart-buffer').SmartBuffer;
const syslog        = require('syslog-client');

let logger;
if (process.env.STANDALONE === 'true') {
  logger = {};
  logger.log = console.log;
}
else
  logger      = syslog.createClient('logger');

// ******************************************************************
//  Device types are defined by VideoRay
//  See sample code at https://github.com/videoray/VRCommsProtocol_doc
//  for more info.
//  Protocol constants
//  See https://github.com/videoray/VRCommsProtocol_doc/blob/master/pro4%20sample/inc/protocol_pro4.h
//
// @name Predefined Registers
//
// The ADDR_UTILITY register is used for device independent actions, such as
// requesting the device eummeration data
// The ADDR_REBOOT register is 16-bit at addresses 0xFE-0xFF
// Writing the value 0xDEAD into the Utility register should cause the // device to reboot after a delay.
//
// Allows for the encapsulation of a custom command protocol
// ******************************************************************

const constants = {
  DEVICE_HOST_COMPUTER: 0x0,
  DEVICE_PRO4_ROV: 0x1,
  DEVICE_MANIPULATOR: 0x2,
  DEVICE_CAMERA: 0x3,
  DEVICE_THRUSTER_MODULE: 0x4,
  DEVICE_RADIATION_SENSOR: 0x5,
  DEVICE_CP_PROBE: 0x6,
  DEVICE_LIGHT: 0x7,
  DEVICE_GENERIC_SENSOR_MODULE: 0x8,
  DEVICE_PROTOCOL_ADAPTER_MUX: 0x10,
  DEVICE_KCF_SMART_TETHER_NODE: 0x50,
  PROTOCOL_PRO4_HEADER_SIZE: 6,
  PROTOCOL_PRO4_RESPONSE_DATA_PAYLOAD_START_INDEX: 8,
  SYNC_REQUEST32_b1: 0xF5,  // CRCs are four bytes
  SYNC_REQUEST32_b2: 0x5F,  // CRCs are four bytes
  SYNC_REQUEST8_b1: 0xFA,   // CRCs are one bytes
  SYNC_REQUEST8_b2: 0xAF,   // CRCs are one bytes
  SYNC_RESPONSE32_b1: 0xF0,  // CRCs are four bytes
  SYNC_RESPONSE32_b2: 0x0F,  // CRCs are four bytes
  SYNC_RESPONSE8_b1: 0xFD,   // CRCs are one bytes
  SYNC_RESPONSE8_b2: 0xDF,   // CRCs are one bytes
  SYNC_REQUEST8LE: 0xAFFA,  // CRCs are one byte
  SYNC_REQUEST32LE: 0x5FF5, // CRCs are four bytes
  SYNC_REQUEST8BE: 0xFAAF,  // CRCs are one byte
  SYNC_REQUEST32BE: 0xF55F, // CRCs are four bytes
  SYNC_RESPONSE8LE: 0xDFFD, // parsed endianness, CRCs one byte
  SYNC_RESPONSE32LE: 0x0FF0, // parsed endianness, CRCs four bytes
  SYNC_RESPONSE8BE: 0xFDDF, // parsed endianness, CRCs one byte
  SYNC_RESPONSE32BE: 0xF00F, // parsed endianness, CRCs four bytes
  ID_BROADCAST: 0xFF,
  ID_MULTICAST_FLAG: 0x80,
  ID_RELAY_REQUEST_FLAG: 0x40,
  LENGTH_EXTENDED: 0xFF, // payload larger than 254 bytes
  TOP_OF_CSR: 0xF0,
  TOP_OF_FULL_CSR: 0x100,
  ADDR_CUSTOM_COMMAND: 0xF0,
  ADDR_CONFIG_DATA_SIZE: 0xF5,
  ADDR_CONFIG_DATA: 0xF7,
  ADDR_NODE_ID: 0xFB,
  ADDR_GROUP_ID: 0xFC,
  ADDR_DEVICE_ID: 0xFD, // returns factory unique ID
  ADDR_UTILITY: 0xFE,
  ADDR_REBOOT: 0xFE,
  REBOOT_CODE: 0xADDE,  // LSB First
  STATUS_SUCCESS: 1,    // PRO4 parser success
  STATUS_ERROR: 2,      // PRO4 parser error
  STATUS_MOREDATA: 3,   // PRO4 current state awaiting more data
  MAX_MESSAGE_SIZE: 255 // Used by PRO4 parser
};

class Pro4 extends EventEmitter
{
  constructor(motorReqLen, ctx)
  {
    super();
    this.constants = constants;
    this.counter = 1; // used for variable length fields
    this.headBuf = new Buffer.allocUnsafe(6); // temporary head buffer for crc
    this.request = 0; // 0 = request; 1 = response
    this.motorReqLen = motorReqLen;
    this.ctx = ctx;
    this.parseBuf = SmartBuffer.fromSize(64512); // to hold serial buffer
    this.parsedObj = {
      sync1: 0,
      sync2: 0,
      id: 0,
      flags: 0,
      csrAddress: 0,
      payloadLen: 0,
      crcHead: 0,
      payload: 0,
      crcTotal: 0,
      device: {},
      status: 0,
      type: ''
    };

    // event listeners
    this.on('receivedSerialData', function(data) {
      this.receivedSerialData(data)});
    this.on('parseSerialData', function(length) {
      this.parse(length, false)});
    this.on('error', function(e) {
      logger.log(`PRO4: Error = ${e.message}`);
    });

    // VideoRay PRO4 thruster request payload
    this.ParserMotorsReq = new Parser()
      .uint8('payloadCmd')
      .uint8('responderIdx')
      .array("power", {
        type: "floatle",
        length: function() {
          return this.motorReqLen;
        }
      })

    // VideoRay PRO4 thruster response payload
    this.ParserMotors = new Parser()
      .uint8('deviceType')
      .floatle('rpm')
      .floatle('bus_v')
      .floatle('bus_i')
      .floatle('temp')
      .uint8('fault');

    // VideoRay PRO4 light module request payload
    this.ParserLightsReq = new Parser()
    .floatle('pwr_bank1')
    .floatle('pwr_bank2')
    .floatle('pwr_bank3');

    // VideoRay PRO4 light module response payload
    this.ParserLights = new Parser()
      .uint8('deviceType')
      .floatle('bus_v')
      .floatle('bus_i')
      .floatle('temp')
      .uint8('fault');

    // VideoRay PRO4 gripper module request payload
    this.ParserGrippersReq = new Parser()
      .uint8('cmd')
      .uint8('flag')
      .uint16be('i_lim')

    // VideoRay PRO4 gripper module response payload
    this.ParserGrippers = new Parser()
      .uint8('cmd')
      .uint8('cmdStatus')
      .uint16be('i_lim')
      .uint16be('current')
      .uint16be('temp')
      .uint8('devAddress')
      .uint32be('firmwareVersion');

    // VideoRay PRO4 light module response payload
    this.ParserLaser = new Parser()
      .uint8('cmd')
      .uint32le('uptime')
      .uint8('status')
      .floatle('pressure')
      .floatle('temp');

    // CT Sensor module response payload
    this.ParserCtsensorReq = Parser.start()
      .string('ct', {
        encoding: 'ascii',
        greedy: true
      });

    this.stop = new Parser();
    // Board44 keller request payload
    this.ParserBoard44Req = new Parser()
      .uint8('cmd')
      .choice({
        tag: 'cmd',
        choices: {
          3: this.ParserCtsensorReq,
          4: this.stop,
          6: this.stop
        }
      });

    // Keller sensor module response payload
    this.ParserKeller = Parser.start()
      .uint8('cmd')
      .uint32le('uptime')
      .uint8('status')
      .floatle('pressure')
      .floatle('temp');

    // CT Sensor module response payload
    this.ParserCtsensor = Parser.start()
      .uint8('cmd')
      .string('ct', {
        encoding: 'ascii',
        greedy: true
      });

    // Board 44 BAM data status response payload
    this.ParserBoard44Bam = Parser.start()
      .uint8('cmd')
      .uint32le('uptime')
      .uint8('status')
      .floatle('pressure')
      .floatle('minPressure')
      .floatle('maxPressure')
      .uint16le('kellerCust0')
      .uint16le('kellerCust1')
      .uint16le('kellerScale0')
      .floatle('acs764n1')
      .floatle('acs764n2')
      .floatle('acs764n3')
      .floatle('acs764n4')
      .floatle('adc0')
      .floatle('adc1')
      .floatle('adc2')
      .floatle('adc3')
      .floatle('adc4')
      .floatle('adc5')
      .floatle('adc6')
      .floatle('adc7');

    // PRO4 translator 44 board
    this.ParserBoard44 = new Parser()
      .uint8('cmd')
      .choice('data', {
        tag: 'cmd',
        choices: {
          3: this.ParserCtsensor,
          4: this.ParserKeller,
          6: this.ParserBoard44Bam
        }
      });

    // SCINI crumb644 PRO4 request payload
    // Pre-IMU payload
    this.ParserBam44Req = new Parser()
      .string('scni', { length: 4 })
      .uint8('len')  // len = 2 for NOOP; len = 7 for BAM
      .uint8('cmd')  // 0 = read?; 1 = read?; 2 = BAM; 0x40 = error string in payload (implemented?)
      .uint16le('servo1')
      .uint16le('servo2')
      .uint8('gpioOut')

    // SCINI crumb644 PRO4 response payload
    // Pre-IMU payload
    this.ParserBam44 = new Parser()
      .string('scni', { length: 4 })
      .uint8('len')
      .uint8('cmd')
      .uint16le('servo1')
      .uint16le('servo2')
      .uint8('gpioOut')
      .uint8('gpioIn')
      .array('acs764', {
        type: 'floatle',
        length: 4
      })
      .array('tmp102', {
        type: 'floatle',
        length: 4
      })
      .array('adcKelvin', {
        type: 'floatle',
        length: 2
      })
      .array('adcVolts', {
        type: 'floatle',
        length: 3
      })
      .floatle('adc48v')
      .floatle('adc24v')
      .floatle('adc12v')
      .floatle('kellerTemperature')
      .floatle('kellerPressure')
      .uint8('kellerStatus')
      .uint8('pad')

    // SCINI crumb644 PRO4 request payload
    this.ParserBamReqNoop = Parser.start()
      .uint8('cmd') // 0 = read?; 1 = read?; 2 = BAM; 0x40 = error string in payload (implemented?)
    this.ParserBamReqFull = Parser.start()
      .uint8('cmd') // 0 = read?; 1 = read?; 2 = BAM; 0x40 = error string in payload (implemented?)
      .uint16le('servo1')
      .uint16le('servo2')
      .uint8('gpioOut')
    this.ParserBamReq = new Parser()
      .string('scni', { length: 4 })
      .uint8('len') // len = 2 for NOOP; len = 7 for BAM!
      .choice({
        tag: 'len',
        choices: {
          2: this.ParserBamReqNoop, // When tagValue == 1, execute parser1
          7: this.ParserBamReqFull, // When tagValue == 4, execute parser2
        }
      })

    // SCINI crumb644 PRO4 response payload
    this.ParserBam = new Parser()
      .string('scni', { length: 4 })
      .uint8('len')
      .uint8('cmd')
      .uint16le('servo1')
      .uint16le('servo2')
      .uint8('gpioOut')
      .uint8('gpioIn')
      .array('acs764', {
        type: 'floatle',
        length: 4
      })
      .array('tmp102', {
        type: 'floatle',
        length: 4
      })
      .array('adcKelvin', {
        type: 'floatle',
        length: 2
      })
      .array('adcVolts', {
        type: 'floatle',
        length: 3
      })
      .floatle('adc48v')
      .floatle('adc24v')
      .floatle('adc12v')
      .floatle('kellerTemperature')
      .floatle('kellerPressure')
      .uint8('kellerStatus')
      .uint8('pad')
      .int16le('accel_x')
      .int16le('accel_y')
      .int16le('accel_z')
      .int16le('angle_x')
      .int16le('angle_y')
      .int16le('angle_z')
      .int16le('rot_x')
      .int16le('rot_y')
      .int16le('rot_z')
      .uint32le('uptimeMillis')
      .int32le('imuPressure')
      .int16le('imuTemp')

    this.fsm = this.createStateMachine();
  };

  receivedSerialData(data)
  {
    // smart-buffer should keep track of write cursor
    logger.log('PRO4: Received serial data');
    this.parseBuf.writeBuffer(data);
    this.emit('parseSerialData', this.parseBuf.length);
  }

  fsmEnterHandler(event, from, to)
  {
    logger.log(`PRO4: Parser moved from ${from} to ${to}`);
  };

  createStateMachine()
  {
    let self = this;

    return StateMachine.create({
      // target: this.FSM.prototype, // XXX - recommended factory method, why?
      initial: '_s_sync1',
      events: [
        { name: 'GetSync2', from: '_s_sync1', to: '_s_sync2' },
        { name: 'GetId', from: '_s_sync2', to: '_s_id' },
        { name: 'GetFlags', from: '_s_id', to: '_s_flags' },
        { name: 'GetCsr', from: '_s_flags', to: '_s_csrAddress' },
        { name: 'GetPayloadLen', from: '_s_csrAddress', to: '_s_payloadLen' },
        { name: 'GetCrcHead', from: '_s_payloadLen', to: '_s_crcHead' },
        { name: 'GetPayload', from: '_s_crcHead', to: '_s_payload' },
        { name: 'GetCrcTotal', from: '_s_payload', to: '_s_crcTotal' },
        { name: 'ResetState', from: '*', to: '_s_sync1' }
      ],
      callbacks: {
        on_s_sync1:           self.fsmEnterHandler,
        on_s_sync2:           self.fsmEnterHandler,
        on_s_id:              self.fsmEnterHandler,
        on_s_flags:           self.fsmEnterHandler,
        on_s_csrAddress:      self.fsmEnterHandler,
        on_s_payloadLen:      self.fsmEnterHandler,
        on_s_crcHead:         self.fsmEnterHandler,
        on_s_payload:         self.fsmEnterHandler,
        on_s_crcTotal:        self.fsmEnterHandler
      }
    });
  };

  reset()
  {
    let self = this;
    self.counter = 1;
    self.request = 0;
    self.parsedObj = {
      sync1: 0,
      sync2: 0,
      id: 0,
      flags: 0,
      csrAddress: 0,
      payloadLen: 0,
      crcHead: 0,
      payload: 0,
      crcTotal: 0,
      device: {},
      status: 0,
      type: ''
    };
    self.fsm.ResetState();
    // toss used bytes in parseBuf
    let sliceOffset = self.parseBuf.writeOffset - self.parseBuf.readOffset;
    self.parseBuf = SmartBuffer.fromBuffer(self.parseBuf.readBuffer(self.parseBuf.remaining()));
    self.parseBuf.writeOffset = sliceOffset;
  }

  async parsePayload()
  {
    switch(this.parsedObj.id)
    {
      case 12:
      {
        this.parsedObj.type = 'motors';
        if (this.request == 0)
        {
          return await this.ParserMotors.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserMotorsReq.parse(this.parsedObj.payload);
        }
      }
      case 13:
      {
        this.parsedObj.type = 'motors';
        if (this.request == 0)
        {
          return await this.ParserMotors.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserMotorsReq.parse(this.parsedObj.payload);
        }
      }
      case 14:
      {
        this.parsedObj.type = 'motors';
        if (this.request == 0)
        {
          return await this.ParserMotors.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserMotorsReq.parse(this.parsedObj.payload);
        }
      }
      case 15:
      {
        this.parsedObj.type = 'motors';
        if (this.request == 0)
        {
          return await this.ParserMotors.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserMotorsReq.parse(this.parsedObj.payload);
        }
      }
      case 16:
      {
        this.parsedObj.type = 'motors';
        if (this.request == 0)
        {
          return await this.ParserMotors.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserMotorsReq.parse(this.parsedObj.payload);
        }
      }
      case 129: // motor multicast request id, never a response id
      {
        this.parsedObj.type = 'motors';
        return await this.ParserMotorsReq.parse(this.parsedObj.payload);
      }
      case 51:
      {
        this.parsedObj.type = 'sensors';
        if (this.request == 0)
        {
          return await this.ParserBam.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBamReq.parse(this.parsedObj.payload);
        }
      }
      case 52:
      {
        this.parsedObj.type = 'pilot';
        if (this.request == 0)
        {
          return await this.ParserBam.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBamReq.parse(this.parsedObj.payload);
        }
      }
      case 57:
      {
        this.parsedObj.type = 'sensors';
        if (this.request == 0)
        {
          return await this.ParserBam.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBamReq.parse(this.parsedObj.payload);
        }
      }
      case 58:
      {
        this.parsedObj.type = 'sensors';
        if (this.request == 0)
        {
          return await this.ParserBam.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBamReq.parse(this.parsedObj.payload);
        }
      }
      case 61:
      {
        this.parsedObj.type = 'lights';
        if (this.request == 0)
        {
          return await this.ParserLights.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserLightsReq.parse(this.parsedObj.payload);
        }
      }
      case 62:
      {
        this.parsedObj.type = 'lights';
        if (this.request == 0)
        {
          return await this.ParserLights.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserLightsReq.parse(this.parsedObj.payload);
        }
      }
      case 63:
      {
        this.parsedObj.type = 'lights';
        if (this.request == 0)
        {
          return await this.ParserLights.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserLightsReq.parse(this.parsedObj.payload);
        }
      }
      case 64:
      {
        this.parsedObj.type = 'lights';
        if (this.request == 0)
        {
          return await this.ParserLights.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserLightsReq.parse(this.parsedObj.payload);
        }
      }
      case 65:
      {
        this.parsedObj.type = 'lights';
        if (this.request == 0)
        {
          return await this.ParserLights.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserLightsReq.parse(this.parsedObj.payload);
        }
      }
      case 66:
      {
        this.parsedObj.type = 'lights';
        if (this.request == 0)
        {
          return await this.ParserLights.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserLightsReq.parse(this.parsedObj.payload);
        }
      }
      case 67:
      {
        this.parsedObj.type = 'sensors';
        if (this.request == 0)
        {
          return await this.ParserBam.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBamReq.parse(this.parsedObj.payload);
        }
      }
      case 81:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 82:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 83:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 84:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 85:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 86:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 87:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 88:
      {
        this.parsedObj.type = 'board44';
        if (this.request == 0)
        {
          return await this.ParserBoard44.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserBoard44Req.parse(this.parsedObj.payload);
        }
      }
      case 24:
      {
        this.parsedObj.type = 'gripper';
        if (this.request == 0)
        {
          return await this.ParserGrippers.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserGrippersReq.parse(this.parsedObj.payload);
        }
      }
      case 23:
      {
        this.parsedObj.type = 'waterSampler';
        if (this.request == 0)
        {
          return await this.ParserGrippers.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserGrippersReq.parse(this.parsedObj.payload);
        }
      }
      case 21:
      {
        this.parsedObj.type = 'trim';
        if (this.request == 0)
        {
          return await this.ParserGrippers.parse(this.parsedObj.payload);
        }
        else
        {
          return await this.ParserGrippersReq.parse(this.parsedObj.payload);
        }
      }
      default:
      {
        this.parsedObj.type = 'notFound';
        return({});  // returning to this.parsedObj.device.{}
      }
    }
  }

  // Decode PRO4 response, calculate checksum, and pass to device parser
  async parse(length, returnObject)
  {
    let self = this;

    while (self.parseBuf.remaining() != 0 && self.parseBuf.writeOffset > self.parseBuf.readOffset)
    {
      switch(self.fsm.current)
      {
        case '_s_sync1':
        {
          let byte = self.parseBuf.readUInt8();
          if (byte == self.constants.SYNC_RESPONSE8_b1 ||
              byte == self.constants.SYNC_RESPONSE32_b1)
          {
            self.parsedObj.sync1 = byte;
            self.headBuf[0] = self.parsedObj.sync1;
            self.request = 0;
            self.fsm.GetSync2();
          }
          else if (byte == self.constants.SYNC_REQUEST8_b1 ||
                  byte == self.constants.SYNC_REQUEST32_b1)
          {
            self.parsedObj.sync1 = byte;
            self.headBuf[0] = self.parsedObj.sync1;
            self.request = 1;
            self.fsm.GetSync2();
          }
          else if (self.parseBuf.remaining()-1 === 0) // end of buffer
          {
            logger.debug('PRO4: No valid sync byte in PRO4 response at byte = ', buf[idx], 'state = ', self.fsm.current);
            self.parsedObj.status = self.constants.STATUS_ERROR;
            let cursor = self.parseBuf.readOffset;
            self.parseBuf.readOffset = 0;
            this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
            self.reset();
          }
          break;
        }
        case '_s_sync2':
        {
          let byte = self.parseBuf.readUInt8();
          if ((byte == self.constants.SYNC_RESPONSE8_b2 && self.parsedObj.sync1 == self.constants.SYNC_RESPONSE8_b1) ||
          (byte == self.constants.SYNC_RESPONSE32_b2 && self.parsedObj.sync1 == self.constants.SYNC_RESPONSE32_b1))
          {
            self.parsedObj.sync2 = byte;
            self.headBuf[1] = self.parsedObj.sync2;
          }
          else if ((byte == self.constants.SYNC_REQUEST8_b2 && self.parsedObj.sync1 == self.constants.SYNC_REQUEST8_b1) ||
              (byte == self.constants.SYNC_REQUEST32_b2 && self.parsedObj.sync1 == self.constants.SYNC_REQUEST32_b1))
          {
            self.parsedObj.sync2 = byte;
            self.headBuf[1] = self.parsedObj.sync2;
          }
          else
          {
            logger.log(`PRO4: Invalid PRO4 ${self.request == 1 ? 'request':'response'} at byte = ${byte} state = ${self.fsm.current}`);
            let cursor = self.parseBuf.readOffset;
            self.parseBuf.readOffset = 0;
            this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
            self.reset();
            break;
          }
          self.fsm.GetId();
          break;
        }
        case '_s_id':
        {
          let byte = self.parseBuf.readUInt8();
          if ((byte >= 1 && byte <= 127 && self.request == 0)
               || self.request == 1)
          {
            self.parsedObj.id = byte;
            self.headBuf[2] = self.parsedObj.id;
            self.fsm.GetFlags();
          }
          else
          {
            logger.log(`PRO4: Invalid PRO4 ${self.request == 1 ? 'request':'response'} device ID = ${byte}`);
            let cursor = self.parseBuf.readOffset;
            self.parseBuf.readOffset = 0;
            this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
            self.reset();
          }
          break;
        }
        case '_s_flags':
        {
          self.parsedObj.flags = self.parseBuf.readUInt8();
          self.headBuf[3] = self.parsedObj.flags;
          self.fsm.GetCsr();
          break;
        }
        case '_s_csrAddress':
        {
          self.parsedObj.csrAddress = self.parseBuf.readUInt8();
          self.headBuf[4] = self.parsedObj.csrAddress;
          self.fsm.GetPayloadLen();
          break;
        }
        case '_s_payloadLen':
        {
          self.parsedObj.payloadLen = self.parseBuf.readUInt8();
          if (self.parsedObj.payloadLen < 255) // we don't support extended length PRO4 packets yet
          {
            self.headBuf[5] = self.parsedObj.payloadLen;
            self.fsm.GetCrcHead();
          }
          else
          {
            logger.log('PRO4: Received 255 as payload length but we don\'t support extended length packets; Dropping)');
            let cursor = self.parseBuf.readOffset;
            self.parseBuf.readOffset = 0;
            this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
            self.reset();
          }
          break;
        }
        case '_s_crcHead':
        {
          if (self.parsedObj.sync1 == self.constants.SYNC_RESPONSE8_b1
              || self.parsedObj.sync1 == self.constants.SYNC_REQUEST8_b1)
          {
            self.counter = 1;

            let chksum = self.parsedObj.sync1 ^ self.parsedObj.sync2 ^ self.parsedObj.id ^ self.parsedObj.flags ^ self.parsedObj.csrAddress ^ self.parsedObj.payloadLen;

            let byte = self.parseBuf.readUInt8();
            if (byte != chksum)
            {
              logger.log(`PRO4: Bad header CRC; possible id = ${self.parsedObj.id}`);
              let cursor = self.parseBuf.readOffset;
              self.parseBuf.readOffset = 0;
              this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
              self.reset();
              break;
            }
            self.parsedObj.crcHead = byte;
            if (self.parsedObj.payloadLen != 0)
            {
                self.fsm.GetPayload();
            }
            else
            {
              self.parsedObj.status = self.constants.STATUS_SUCCESS;
              if (returnObject === true) {
                let copy = JSON.parse(JSON.stringify(self.parsedObj));;
                self.reset();
                return copy;
              }
              else
                this.ctx.emit('parsedPacket', self.parsedObj);
              self.reset();
            }
          }
          else // 4-byte CRC
          {
            if (self.counter == 1)
            {
              self.parsedObj.crcHead = new Buffer.allocUnsafe(4);
            }

            if (self.counter > 0 && self.counter < self.parsedObj.crcHead.length) // need more data
            {
              self.parsedObj.crcHead[self.counter-1] = self.parseBuf.readUInt8();
              let remaining = self.parseBuf.writeOffset - self.parseBuf.readOffset;
              if (remaining < self.parsedObj.crcHead.length) // need to wait for next message
              {
                self.parsedObj.status = self.constants.STATUS_MOREDATA;
              }
              self.counter++;
              break;
            }

            if (self.counter == self.parsedObj.crcHead.length)
            {
              self.parsedObj.status = 0;
              self.parsedObj.crcHead[self.counter-1] = self.parseBuf.readUInt8();
              let calcdChksum = CRC.crc32(self.headBuf); // calculate checksum of received data
              if (calcdChksum != self.parsedObj.crcHead.readUInt32LE(0))
              {
                logger.log(`PRO4: Bad header CRC32; possible id = ${self.parsedObj.id}`);
                let cursor = self.parseBuf.readOffset;
                self.parseBuf.readOffset = 0;
                this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
                self.reset();
              }
              self.counter = 1;
              if (self.parsedObj.payloadLen != 0)
                self.fsm.GetPayload();
              else
              {
                self.parsedObj.status = self.constants.STATUS_SUCCESS;
                if (returnObject === true) {
                  let copy = JSON.parse(JSON.stringify(self.parsedObj));;
                  self.reset();
                  return copy;
                }
                else
                  this.ctx.emit('parsedPacket', self.parsedObj);
                self.reset();
              }
            }

            if (self.counter <= 0 || self.counter > self.parsedObj.crcHead.length) // something went awry
            {
              logger.log(`PRO4: Something went wrong with header CRC32; possible id = ${self.parsedObj.id}`);
              let cursor = self.parseBuf.readOffset;
              self.parseBuf.readOffset = 0;
              this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
              self.reset();
            }
          }
          break;
        }
        case '_s_payload':
        {
          if (self.counter == 1)
          {
            self.parsedObj.payload = new Buffer.allocUnsafe(self.parsedObj.payloadLen);
          }

          if (self.counter > 0 && self.counter <  self.parsedObj.payloadLen) // need more data
          {
            self.parsedObj.payload[self.counter-1] = self.parseBuf.readUInt8();
            let remaining = self.parseBuf.writeOffset - self.parseBuf.readOffset;
            if (remaining < self.parsedObj.payloadLen) // need to wait for next message
            {
              self.parsedObj.status = self.constants.STATUS_MOREDATA;
            }
            self.counter++;
            break;
          }

          if (self.counter == self.parsedObj.payloadLen)
          {
            self.parsedObj.status = 0; // reset status
            self.parsedObj.payload[self.counter-1] = self.parseBuf.readUInt8();
            self.counter = 1;
          }

          if (self.counter <= 0 || self.counter > self.parsedObj.payloadLen) // something went awry
          {
            logger.log(`PRO4: Something went wrong with payload parsing; possible id = ${self.parsedObj.id}`);
            let cursor = self.parseBuf.readOffset;
            self.parseBuf.readOffset = 0;
            this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
            self.reset();
            break;
          }
          self.fsm.GetCrcTotal();
          break;
        }
        case '_s_crcTotal':
        {
          if (self.parsedObj.sync1 == self.constants.SYNC_RESPONSE8_b1
            || self.parsedObj.sync1 == self.constants.SYNC_REQUEST8_b1)
          {
            let chksum = self.parsedObj.payload[0];
            for (let i = 1; i < self.parsedObj.payloadLen; i++) {
              chksum ^= self.parsedObj.payload[i];
            }
            let byte = self.parseBuf.readUInt8();
            if (byte != chksum)
            {
              logger.log(`PRO4: Bad total CRC; ${chksum} vs ${byte}; possible id = ${self.parsedObj.id}`);
              let cursor = self.parseBuf.readOffset;
              self.parseBuf.readOffset = 0;
              this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
              self.reset();
              break;
            }
            else
            {
              let obj_s = JSON.stringify(self.parsedObj);
              // got a good full packet!  Pass it to payload parser
              logger.log(`PRO4: Good total CRC ${obj_s}`);
              self.parsedObj.crcTotal = byte;
              self.parsedObj.status = self.constants.STATUS_SUCCESS;
              self.parsedObj.device = await self.parsePayload();
              if (returnObject === true) {
                let copy = JSON.parse(JSON.stringify(self.parsedObj));;
                self.reset();
                return copy;
              }
              else
                this.ctx.emit('parsedPacket', self.parsedObj);
            }
          }
          else // 4-byte CRC
          {
            if (self.counter == 1)
            {
              self.parsedObj.crcTotal = new Buffer.allocUnsafe(4);
            }

            if (self.counter > 0 && self.counter < self.parsedObj.crcTotal.length) // need more data
            {
              self.parsedObj.crcTotal[self.counter-1] = self.parseBuf.readUInt8();
              let remaining = self.parseBuf.writeOffset - self.parseBuf.readOffset;
              if (remaining < self.parsedObj.crcTotal.length) // need to wait for next message
              {
                self.parsedObj.status = self.constants.STATUS_MOREDATA;
              }
              self.counter++;
              break;
            }

            if (self.counter == self.parsedObj.crcTotal.length)
            {
              self.parsedObj.status = 0;
              self.parsedObj.crcTotal[self.counter-1] = self.parseBuf.readUInt8();
              let calcdChksum = CRC.crc32(self.parsedObj.payload); // calculate checksum of received data
              if (calcdChksum != self.parsedObj.crcTotal.readUInt32LE(0))
              {
                logger.log(`PRO4: Bad total CRC32; possible id = ${self.parsedObj.id}`);
                let cursor = self.parseBuf.readOffset;
                self.parseBuf.readOffset = 0;
                this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
                self.reset();
                break;
              }

              let obj_s = JSON.stringify(self.parsedObj);
              // got a good full packet!  Pass it to payload parser
              logger.log(`PRO4: Good total CRC32; obj = ${obj_s}`);
              self.parsedObj.status = self.constants.STATUS_SUCCESS;
              self.parsedObj.device = await self.parsePayload();
              if (returnObject === true) {
                let copy = JSON.parse(JSON.stringify(self.parsedObj));;
                self.reset();
                return copy;
              }
              else
                this.ctx.emit('parsedPacket', self.parsedObj);
            }

            if (self.counter <= 0 || self.counter > self.parsedObj.crcTotal.length) // something went awry
            {
              logger.log(`PRO4: Something went wrong with total CRC32; possible id = ${self.parsedObj.id}`);
              let cursor = self.parseBuf.readOffset;
              self.parseBuf.readOffset = 0;
              this.ctx.emit('parsedPacket', {data: self.parseBuf.readBuffer(cursor), status: self.constants.STATUS_ERROR});
              self.reset();
            }
          }
          self.reset();
          break;
        }
      }
    }
    if (self.parsedObj.status == self.constants.STATUS_MOREDATA)
    {
      this.ctx.emit('parsedPacket', {status: self.constants.STATUS_MOREDATA});
    }
  };

  // Encode PRO4 packet and calculate checksums
  encode(sync, id, flags, csrAddress, len, payload)
  {
    let self = this;
    // to hold 1-byte checksums
    let chksum = 0;
    // assume 1-byte CRC message, parser errors on invalid sync bytes
    let padding = 1;

    if (sync === this.constants.SYNC_REQUEST32BE
        || sync === this.constants.SYNC_RESPONSE32BE) {
      padding = 4;
    }

    // Create PRO4 packet
    let headerLen = this.constants.PROTOCOL_PRO4_HEADER_SIZE + padding;
    let skip = headerLen + len;
    let buf = new Buffer.allocUnsafe(skip + padding); // should hold entire payload
    buf.writeUInt16BE(sync, 0);
    buf.writeUInt8(id, 2);
    buf.writeUInt8(flags, 3);
    buf.writeUInt8(csrAddress, 4);
    buf.writeUInt8(len, 5);
    // Write header checksum (should be little endian)
    if (sync === this.constants.SYNC_REQUEST32BE
        || sync === this.constants.SYNC_RESPONSE32BE) {
      buf.writeUInt32LE(CRC.crc32(buf.slice(0,6)), this.constants.PROTOCOL_PRO4_HEADER_SIZE);
    }
    if (sync === this.constants.SYNC_REQUEST8BE
        || sync === this.constants.SYNC_RESPONSE8BE) {
      chksum = buf[0] ^ buf[1];
      for (let i = 2; i < this.constants.PROTOCOL_PRO4_HEADER_SIZE; i++) {
        chksum ^= buf[i];
      }
      buf.writeUInt8(chksum, this.constants.PROTOCOL_PRO4_HEADER_SIZE);
      logger.log(`PRO4: My crc8 header = ${chksum.toString(16)}`);;
    }

    if (payload != 0)
    {
      payload.copy(buf, headerLen);

      // Write total checksum (should be little endian)
      if (sync === this.constants.SYNC_REQUEST32BE
          || sync === this.constants.SYNC_RESPONSE32BE) {
        buf.writeUInt32LE(CRC.crc32(buf.slice(headerLen, skip)), skip);
      }
      if (sync === this.constants.SYNC_REQUEST8BE
          || sync === this.constants.SYNC_RESPONSE8BE) {
        chksum = buf[7];
        if (len > 1) {
          for (let i = 8; i < skip; i++) {
            chksum ^= buf[i];
          }
        }
        buf.writeUInt8(chksum, skip);
        logger.log(`PRO4: My crc8 total = ${chksum.toString(16)}`);
      }
    }
    else
    {
      buf = buf.slice(0,7); // read-only zero byte PRO4 request, no need for final checksum
    }

    logger.log(`PRO4: Debug PRO4 ${self.request == 1 ? 'request':'response'} encode = ${buf.toString('hex')}`);
    return buf;
  };

} // end class Pro4

module.exports = {
  Pro4: Pro4,
  constants: constants,
  logger: logger
}
