# Overview

This document describes the key features added to our fork of the OpenROV and other software to create a suitable environment for deployment with the SCINI ROV.

# OpenROV

https://github.com/mcdafydd/openrov-cockpit

This is a fork of the OpenROV-cockpit repository.  All SCINI development is done on the `platform/scini` branch.  Feel free to open issues on Github.

* The mjpeg-video plugin package.json file points to our private fork of the `mjpeg-video-server` module
* `src/plugins/rovpilot/index.js` contains server-side changes to upstream's default pilot controls
* `src/plugins/rovpilot/public/js/rovpilot.js` contains browser-side changes to upstream's default pilot controls
* `src/plugins/scinipilot/` contains all new SCINI keyboard/joystick control operations

## SCINI Platform

The platform code comprises the largest set of updates to the default OpenROV repository to support SCINI.  The base code and structure were copied from the existing platforms.

* `src/system-plugins/platform-manager/platforms/scini/` contains SCINI-specific platform code.  It is executed at run-time by setting the environment variable `PLATFORM='scini'`
* `src/system-plugins/platform-manager/platforms/scini/boards/surface/bridge.js` does most of the work. It:
- Loads the MQTT client and PRO4 parser
- Connects to the broker using a websocket on port 3000/tcp
- Sets `updateInterval` for device-specific update frequencies in milliseconds
* Executes `subscribe()` on several MQTT topics - note that the MQTT pub-sub topics and usage has not been finalized and primarily uses `fromScini/<somthing>` and `toScini/<something>` at the moment.
* For each discovered MQTT client, creates a separate queue that publishes one message at a time, waiting a maximum of 20ms for any response (doesn't try to match published message) and then sends next message in queue.  If a message is received before timeout, it is processed asynchronously and the next message is sent as soon as possible.

# Mjpeg-video-server

https://github.com/mcdafydd/mjpeg-video-server

This node module is responsible for executing mjpg_streamer with arguments to support external MJPEG cameras if the environment variables `EXTERNAL_CAM=true` and `EXTERNAL_CAM_URL` are set.  The mjpg_streamer process is supervised by this module and will be restarted if it terminates.  This module is where additional support for multiple cameras and camera auto-detection will be added.

# Mjpg-streamer

https://github.com/mcdafydd/mjpg-streamer

The `mjpg_streamer` binary is executed by the mjpeg-video-server module, which is a depedency of the OpenROV mjpeg-video plugin.  SCINI leverages the input_http.so plugin to retrieve MJPEG image frames from the Elphel 353 imgsrv process by accessing `http://<ip_of_camera>:8081/bmimg`.  These images are then served to the cockpit browser user on the surface via the output_ws.so plugin on port 8200/tcp.  The output_file.so plugin can be toggled on and off to handle recording individual images on a shared folder on the server.

For more information on imgsrv, see: https://www.elphel.com/wiki/Imgsrv

# Mqtt-broker

https://github.com/mcdafydd/mqtt-broker

This OpenROV plugin acts as an MQTT broker on the surface computer.  It facilitates all communication between the OpenROV server and Elphel cameras acting as MQTT-to-serial gateway clients via the Elphel-mqtt-client package described in the next section.  The broker is implemented using the mosca library.

For more information on mosca, see https://github.com/mcollina/mosca.

Code for this plugin has been added to the SCINI openrov-cockpit branch as a git submodule in `src/plugins/mqtt-broker`:

# Elphel-mqtt-client

https://github.com/mcdafydd/elphel-mqtt-client

This is a simple MQTT client meant to run on the Elphel 353 cameras inside the ROV.  It will autodiscover the MQTT broker running in OpenROV on the surface using the periodic packets sent from OpenROV via `src/system-plugins/rov-beacon`.  If autodiscover doesn't succeed within 10 seconds, the client will die and the /etc/inittab configuration will restart the client.

The client subscribes to the `toScini/elphel/request` and `toScini/elphel-<macaddr>` topics.  The only surface MQTT client at the moment is part of the OpenROV SCINI platform code, but there is no reason that a suitable MQTT.js or other surface client couldn't publish messages to the broker that would be received by the underwater subscribers.

Any MQTT packets received by Elphel-mqtt-client will be written to the (device) file specified by the environment variable USBDEVICE at startup time or to /dev/ttyUSB0 by default.

A select() loop will process data sent from the serial device every 100us and then publish the data (hopefully in a single frame) to topic `fromScini/elphel-<macaddr>`, which will be received and processed by the SCINI platform MQTT client code within OpenROV.

## Deploying Elphel-mqtt-client

TODO