#!/bin/bash

socat pty,raw,echo=0,b115200,link=/tmp/link TCP:$PARTNER:50000 & sleep 1 && PTY=/tmp/link /srv/serial-tester.js

