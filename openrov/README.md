# Overview

This project contains the docker build files to create a version of OpenROV cockpit suitable to operate the SCINI underwater ROV.

# Getting Started

## Build OpenROV Container
* Install Docker, preferably the latest version of Docker CE - `https://docs.docker.com/install/`
* From the directory containing the Dockerfile - `docker build -t openrov .`

## Run an Instance of OpenROV outside of docker-compose in scini-cockpit repo
## Expects that you have an Elphel camera on the LAN
* `docker run -it -p 80:80 -p 1883:1883 -p 3000:3000 -p 8080:8080 -p 8200:8200 -p 8201:8201 -p 8202:8202 -p 8203:8203 -p 8204:8204 -p 8300:8300 -p 9229:9229 openrov <IP_of_forward_Elphel_camera>`
* Access the cockpit via Chrome at http://localhost, or from another system on the same LAN using the host's IP address

## Network Ports Used by OpenROV
* 80, 8080 = HTTP
* 1883 = MQTT (communicates with RS485 gateways)
* 3000 = MQTT-ws
* 8200 = mjpg_streamer output_ws.so plugin websocket server (streams MJPEG to browser using output_http.so plugin)
* 8201 = mjpg_streamer output_ws.so plugin http server (streams MJPEG to browser using output_http.so plugin, serving www/ folder)
* 8202 = mjpg_streamer output_ws.so plugin http server (streams MJPEG to browser using output_http.so plugin, serving www/ folder)
* 8203 = mjpg_streamer output_ws.so plugin http server (streams MJPEG to browser using output_http.so plugin, serving www/ folder)
* 8204 = mjpg_streamer output_ws.so plugin http server (streams MJPEG to browser using output_http.so plugin, serving www/ folder)
* 8300 = Mjpeg-video plugin supervisor
* 9229 = Node debug (ie: for Chrome DevTools)

## Get A Shell
Presuming you're running a single instance of the openrov container, get a shell on it by running:

`docker exec -it $(docker ps |grep openrov | awk '{print $1}') /bin/bash`

## Issues
Visit the repository of problematic components mentioned in the Dockerfile to file issues.  Only file issues with the Dockerfile here.

## Developing
See the SCINI fork of openrov-cockpit for documentation.
https://github.com/mcdafydd/openrov-cockpit
