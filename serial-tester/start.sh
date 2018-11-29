#!/bin/bash

if [ -z "$PORT" ]; then
  PORT=50000
fi

if [ -n "$USBDEV" ]; then
  socat $USBDEV,raw,echo=0 EXEC:/srv/serial-tester.js 
else
  socat TCP-LISTEN:$PORT,reuseaddr,fork EXEC:/srv/serial-tester.js 
fi

