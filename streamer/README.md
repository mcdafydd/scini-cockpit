# Streamer

This service provides an interface between a single camera and SCINI users. It:

* Retrieves an MJPEG stream from a camera
* Expose the MJPEG stream to any number of clients on a websocket 
* May store the images on a persistent volume
* Discovers and connects to the local MQTT broker
* Subscribes to MQTT topics `toCamera/+` and `toCamera/<location>/+`
* Controls camera image parameters

MQTT API:

* toCamera/getCameraMap - returns current connected state and image settings
* toCamera/<location>/snap - takes full resolution snapshot and saves 
* toCamera/<location>/defaults - sets defaults specified in config file
* toCamera/<location>/exposure - sets exposure value in milliseconds
* toCamera/<location>/quality - sets JPEG quality percentage
* toCamera/<location>/resolution - sets 1/N sensor resolution

Configuration:

The file `cameraMap.json` specifies:

- A map between the camera IP address, MQTT client ID, and friendly location name (ie: down, up, forward, side, bore).
- A set of reasonable default values
