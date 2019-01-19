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
* toCamera/<location>/autoexposure - 1 = enable; 0 = disable auto-exposure
* toCamera/<location>/color - 1 = normal color; 5 = Elphel JP4 mode
* toCamera/<location>/defaults - sets defaults specified in config file
* toCamera/<location>/exposure - sets exposure value in milliseconds
* toCamera/<location>/fliph - 1 = flip horizontal; 0 = default 
* toCamera/<location>/flipv - 1 = flip vertical; 0 = default 
* toCamera/<location>/fps - set frames per second (disables auto-exposure)
* toCamera/<location>/quality - sets JPEG quality percentage
* toCamera/<location>/record - 1 = start recording; 0 = stop recording
* toCamera/<location>/resolution - sets 1/N sensor resolution
* toCamera/<location>/snap - takes full resolution snapshot and saves 
* toCamera/<location>/temp - return on-board temperature if available
* toCamera/<location>/whitebalance - 1 = enable; 0 = disable auto white balance

Configuration:

The file `cameraMap.json` specifies:

- A map between the camera IP address, MQTT client ID, and friendly location name (ie: down, up, forward, side, bore).
- A set of reasonable default values
