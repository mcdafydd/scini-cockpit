#!/bin/bash

socat pty,raw,echo=0,b115200,link=/tmp/link TCP-LISTEN:50000,fork,reuseaddr & sleep 1 && USBDEVICE=/tmp/link /usr/local/bin/mqttclient
