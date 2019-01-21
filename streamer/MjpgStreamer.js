import { logger, ERROR, WARN, CRIT, DEBUG } from './shared';
const { exec, spawn } = require('child_process');

function addZero(i) {
  if (i < 10) {
      i = "0" + i;
  }
  return i;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date();
const day = addZero(d.getDate());
const h = addZero(d.getHours());
const m = addZero(d.getMinutes());

export class MjpgStreamer {
  constructor(cameraUri, wsPort) {
    this.proc = {};
    this.recording = false;
    this.uri = new URL(cameraUri); // mjpg_streamer URI for input_http.so plugin
    this.wsPort = wsPort; // mjpg_streamer port for output_ws.so plugin
    this.cmd = 'mjpg_streamer'
    this.argv = ['-i', `input_http.so -p ${this.uri.port} -H ${this.uri.hostname} -u ${this.uri.path}`,
                 '-o', `output_ws.so -p ${this.wsPort}`]

    this.ts = day + months[d.getMonth()] + h + m;
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

    this.recordarg = Array.from(this.argv)
    this.recordarg.push('-o')
    this.recordarg.push(`output_file.so -f ${newChild}`)
  }

  start() {
    if (this.recording) {
      this.proc = spawn(this.cmd, this.recordarg);
    }
    else {
      this.proc = spawn(this.cmd, this.argv);
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
    logger.log('STREAMER: Started mjpg_streamer processes');
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
      logger.log('STREAMER: Stopped mjpg_streamer processes', WARN);
      cb();
    };
  }

  record(bool) {
    if (bool === true && this.recording === false) {
      this.recording = true;
      this.stop(this.start());
    }
    else if (bool === false && this.recording === true) {
      this.recording = false;
      this.stop(this.start());
    }
  }

  restart() {
    this.stop(this.start());
  }
}

