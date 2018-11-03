#!/bin/bash

socat TCP-LISTEN:50000,reuseaddr,fork EXEC:/srv/serial-tester.js 

