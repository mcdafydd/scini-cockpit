# Streamer

This service provides an interface between a single camera and SCINI users. It:

* Retrieves an MJPEG stream from a camera
* Expose the MJPEG stream to any number of clients on a websocket
* May store the images on a persistent volume
* Subscribes to MQTT topics `toStreamer/+` and `toStreamer/<location>/+`
* Controls camera image parameters

## MQTT Subscribe API

* `toStreamer/getStatus` - request current settings
* `toStreamer/<location>/record` - non-zero = start recording; 0 = stop recording
* `toStreamer/<location>/restart` - restart mjpg_streamer process

## MQTT Publish API

* `fromStreamer/<location>/will` - last will message
* `fromStreamer/<location>/status` - return recording status and streamer IP/port config

## Configuration

The following environment variables are used to configure this service:

* `LOCATION` - the name of the camera direction (ie: forward, down, up, side, bore)
* `CAMERAURI` - the URI that will be passed to the mjpg_streamer input_http.so plugin
* `WSPORT` - the port that will be passed to the mjpg_streamer output_ws.so plugin