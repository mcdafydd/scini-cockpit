# Streamer

This service provides an interface between a single camera and SCINI users. It:

* Retrieves an MJPEG stream from a camera
* Expose the MJPEG stream to any number of clients on a websocket
* May store the images on a persistent volume
* Subscribes to MQTT topics `toCameraConfig/+` and `toCameraConfig/<location>/+`
* Controls camera image parameters

MQTT Subscribe API:

* `toCameraConfig/getCameraMap` - returns current connected state and image settings
* `toCameraConfig/<location>/autoexposure` - 1 = enable; 0 = disable auto-exposure
* `toCameraConfig/<location>/color` - 1 = normal color; 5 = Elphel JP4 mode
* `toCameraConfig/<location>/defaults` - sets defaults specified in config file
* `toCameraConfig/<location>/exposure` - sets exposure value in milliseconds
* `toCameraConfig/<location>/fliph` - 1 = flip horizontal; 0 = default
* `toCameraConfig/<location>/flipv` - 1 = flip vertical; 0 = default
* `toCameraConfig/<location>/fps` - set frames per second (disables auto-exposure)
* `toCameraConfig/<location>/quality` - sets JPEG quality percentage
* `toCameraConfig/<location>/resolution` - sets 1/N sensor resolution
* `toCameraConfig/<location>/snap` - takes full resolution snapshot and saves
* `toCameraConfig/<location>/temp` - return on-board temperature if available
* `toCameraConfig/<location>/whitebalance` - 1 = enable; 0 = disable auto white balance

MQTT Publish API:

* `fromCameraConfig/<location>/will` - last will topic

Configuration:

The file `cameraMap.json` specifies:

- A map between the camera IP address, and friendly location name (ie: down, up, forward, side, bore).
- A set of reasonable default values
- Supports a key value of "other" to apply settings to unmatched keys
