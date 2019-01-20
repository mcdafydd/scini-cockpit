# Streamer

This service provides an interface between a single camera and SCINI users. It:

* Retrieves an MJPEG stream from a camera
* Expose the MJPEG stream to any number of clients on a websocket
* May store the images on a persistent volume
* Subscribes to MQTT topics `toStreamer/+` and `toStreamer/<location>/+`
* Controls camera image parameters

MQTT API:

* `toStreamer/getCameraMap` - returns current connected state and image settings
* `toStreamer/<location>/autoexposure` - 1 = enable; 0 = disable auto-exposure
* `toStreamer/<location>/color` - 1 = normal color; 5 = Elphel JP4 mode
* `toStreamer/<location>/defaults` - sets defaults specified in config file
* `toStreamer/<location>/exposure` - sets exposure value in milliseconds
* `toStreamer/<location>/fliph` - 1 = flip horizontal; 0 = default
* `toStreamer/<location>/flipv` - 1 = flip vertical; 0 = default
* `toStreamer/<location>/fps` - set frames per second (disables auto-exposure)
* `toStreamer/<location>/quality` - sets JPEG quality percentage
* `toStreamer/<location>/record` - 1 = start recording; 0 = stop recording
* `toStreamer/<location>/resolution` - sets 1/N sensor resolution
* `toStreamer/<location>/restart` - triggers container terminate (docker restart policy)
* `toStreamer/<location>/snap` - takes full resolution snapshot and saves
* `toStreamer/<location>/temp` - return on-board temperature if available
* `toStreamer/<location>/whitebalance` - 1 = enable; 0 = disable auto white balance

Configuration:

The file `cameraMap.json` specifies:

- A map between the camera IP address, MQTT client ID, and friendly location name (ie: down, up, forward, side, bore).
- A set of reasonable default values
