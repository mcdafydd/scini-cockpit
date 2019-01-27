const shared       = require('./shared');
const fs           = require('fs');
const logger       = shared.logger;
const ERROR        = shared.ERROR;
const WARN         = shared.WARN;
const DEBUG        = shared.DEBUG;
const { exec, spawn } = require('child_process');

class MjpgStreamer {
  constructor(cameraUri, wsPort) {
    this.proc = {};
    this.recording = false;
    this.uri = new URL(cameraUri); // mjpg_streamer URI for input_http.so plugin
    this.serial = this.uri.hostname.split('.')[3];
    this.wsPort = wsPort; // mjpg_streamer port for output_ws.so plugin
    this.cmd = 'mjpg_streamer'
    this.args = ['-i', `input_http.so -p ${this.uri.port} -H ${this.uri.hostname} -u ${this.uri.pathname}`,
                 '-o', `output_ws.so -p ${this.wsPort}`]

    this.ts = shared.get_ts();
    this.newParent = '/srv/scini/images/' + this.ts;
    if (!fs.existsSync(this.newParent))
    {
        fs.mkdirSync(this.newParent, '0775');
    }
    this.newChild = this.newParent + '/' + this.serial;
    if (!fs.existsSync(this.newChild))
    {
        fs.mkdirSync(this.newChild, '0775');
    }

    this.recordargs = Array.from(this.args)
    this.recordargs.push('-o')
    this.recordargs.push(`output_file.so -f ${this.newChild}`)
  }

  start() {
    if (this.recording) {
      logger.log(`STREAMER: Starting ${this.cmd} ${this.recordargs}`);
      this.proc = spawn(this.cmd, this.recordargs);
    }
    else {
      logger.log(`STREAMER: Starting ${this.cmd} ${this.args}`);
      this.proc = spawn(this.cmd, this.args);
    }

    this.proc.stdout.on('data', (data) => {
      logger.log(`stdout: ${data}`, DEBUG);
    });

    this.proc.stderr.on('data', (data) => {
      logger.log(`stderr: ${data}`, ERROR);
    });

    this.proc.on('close', (code) => {
      logger.log(`child process exited with code ${code}`, code == 0 ? DEBUG: ERROR);
    });
    logger.log('STREAMER: Started mjpg_streamer process');
  }

  stop(cb) {
    exec('killall mjpg_streamer', {timeout: 2000});

    (error, stdout, stderr) => {
      if (error) {
        logger.log(`STREAMER: Error ${error} trying to restart mjpg_streamer processes`, ERROR);
        return;
      }
      if (stderr) {
        logger.log(`STREAMER: Error ${stderr} trying to restart mjpg_streamer processes`, ERROR);
        return;
      }
      logger.log('STREAMER: Stopped mjpg_streamer process', WARN);
      cb();
    };
  }

  record(bool) {
    if (bool === true && this.recording === false) {
      logger.log('STREAMER: Enabling mjpg_streamer recording and restarting');
      this.recording = true;
      this.stop(this.start);
    }
    else if (bool === false && this.recording === true) {
      logger.log('STREAMER: Disabling mjpg_streamer recording and restarting');
      this.recording = false;
      this.stop(this.start);
    }
  }

  restart() {
    this.stop(this.start);
  }
}

module.exports.MjpgStreamer = MjpgStreamer;
