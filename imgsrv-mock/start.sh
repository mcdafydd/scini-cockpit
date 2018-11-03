#!/bin/bash

mjpeg-server.py 8081 &
if [ -n "$PARTNER" ]; then
  http-server.js &
  socat PTY,link=/tmp/link,raw,echo=0,wait-slave TCP:$PARTNER:50000 &
  sleep 1
  USBDEVICE=/tmp/link /usr/local/bin/mqttclient
else
  http-server.js
fi