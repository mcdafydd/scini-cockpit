#!/bin/bash

mjpeg-server.py 8081 &
http-server.js &
socat pty,raw,echo=0,link=/tmp/link TCP-LISTEN:50000,fork,reuseaddr & sleep 1 && USBDEVICE=/tmp/link /usr/local/bin/mqttclient
