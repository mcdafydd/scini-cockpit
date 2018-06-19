# Overview

This repository contains that allow for developing the Dockerfiles necessary to build a test SCINI ROV
for development.

# Prerequisites

Ensure the following software is installed on the host:

* Docker or docker-ce
* docker-compose - https://docs.docker.com/compose/install/

Clients wishing to access the system need Chrome or Chromium installed at a minimum.  A USB game joystick is optional as all of the cockpit controls can be accessed by keyboard.

# Running In Production

If you want to run a production system for field work or a tank test, use the `docker-compose.yml` file.  This file only starts an OpenROV container with the default Docker network, so the container network address space will not conflict with the actual SCINI LAN.

0. Edit `docker-compose.yml` and set the IP address on `command:` to match the IP address of the forward camera
1. Run `docker-compose up`
2. Use Chrome to access the cockpit software at http://<ip_of_host>

# Developing SCINI Software

The `docker-compose-dev.yml` file starts a complete SCINI development environment with the following features:

* Docker network subnet is configured to match the private SCINI LAN addressing (192.168.2.0/24)
* Starts an OpenROV container to act as the surface server
* Starts one imgsrv-mock container to represent each Elphel 353 used in a typical SCINI deployment (currently 4)
* Starts two mqttclient-mock containers to simulate control gateways and telemetry data

## Running a Development System

If you want to run a production system for field work or a tank test, use the `docker-compose-dev.yml` file. 

0. Edit `docker-compose-dev.yml` and set the IP address on `command:` to match the IP address of the forward camera or use the default setting
1. Run `docker-compose -f docker-compose-dev.yml up`
2. Use Chrome to access the cockpit software at http://<ip_of_host>

# Developing SCINI Software
## Imgsrv-mock Container

These containers are meant to simulate the MJPEG video functionality of the Elphel cameras.  They run a simple MJPEG HTTP server on port 8081 to simulate the Elphel imgsrv process.  OpenROV uses the mjpg_streamer input_http.so plugin.  The containers also run the same MQTT client software deployed on the Elphels.  The MQTT containers automatically discover the OpenROV MQTT broker and subscribe to messages sent to the toScini/* channels they need.  MQTT payloads received by the clients are immediately sent to the device specified by the USBDEVICE environment variable when the process starts.

These containers can also receive and generate fake PRO4 telemetry data, such as responses sent from thrusters, lights, or other sensors.

*** NOTE the fake telemetry and MQTT features are still under development ***

## Get Started Developing

0. Create a "user-defined" scini network to match the compose file with
  `docker network create --gateway 192.168.2.1 --subnet 192.168.2.0/24 scini`
1. Run `docker-compose up`
2. Open a browser and visit http://localhost to reach the forward camera and cockpit
3. Visit URL paths /rov/up-camera, /rov/down-camera, and /rov/forward-camera to see the other video streams
