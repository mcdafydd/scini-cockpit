#!/bin/bash

if [ -z "$PORT" ]; then
  PORT=50000
fi
socat TCP-LISTEN:$PORT,reuseaddr,fork EXEC:/srv/serial-tester.js 
