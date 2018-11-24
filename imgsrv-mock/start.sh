#!/bin/bash

mjpeg-server.py 8081 &
if [ -z "$PORT" ]; then
  PORT=50000
fi

if [ -n "$PARTNER" ]; then
  http-server.js &
  socat PTY,link=/tmp/link,raw,echo=0,wait-slave TCP:$PARTNER:$PORT &
  sleep 1
  USBDEVICE=/tmp/link /usr/local/bin/mqttclient
else
  http-server.js
fi
