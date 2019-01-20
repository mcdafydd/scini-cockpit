const syslog        = require('syslog-client');
const logger        = syslog.createClient('logger');
const ERROR         = syslog.Severity.Error;
const WARN          = syslog.Severity.Warning;
const DEBUG         = syslog.Severity.Debug;

export class MjpgStreamer {
  constructor(cameraUri, wsPort) {
    this.cameraUri = cameraUri; // mjpg_streamer URI for input_http.so plugin
    this.wsPort = wsPort; // mjpg_streamer port for output_ws.so plugin
  }

  restart() {
    child.exec('killall mjpg_streamer', {
      timeout: 1000
    }, (error, stdout, stderr) => {
      if (error) {
        logger.log(`STREAMER: Error ${error} trying to restart mjpg_streamer processes`, { severity: ERROR });
        return;
      }
      logger.log('STREAMER: Restarted mjpg_streamer processes', { severity: WARN });
    });
  }
}
