# Overview

This repository contains that allow for developing the Dockerfiles necessary to build a test SCINI ROV
for development.  It is the parent repository for all of the SCINI surface-to-serial components.  Code that runs on devices at the end of an RS-485 or other non-IP connection does not currently live on github and does not get built by this repository.  This includes everything a user sees when they open the OpenROV cockpit in a browser, control devices using a joystick or keyboard/mouse action,

# Quick getting started

0. Clone this repository
1. `cd scini-cockpit`
2. Review the script `./install-prereqs.sh`, which installs docker, other dependencies, and performs some setup.
3. Run `./start-dev.sh` (this will take a while to run the first time to build local containers and pull down the openrov container from docker hub)
4. To access the dev openrov instance, open Chrome and visit `http://localhost`. To access the co-pilot interfaces found in `assets/www` go to http://localhost:8204, or port `8200`, `8201`, or `8203`.

# Prerequisites

- Chrome 69+ is required to view the MJPEG streams due to use of the new OffscreenCanvas() with 2d rendering context
- A USB game joystick is optional as all of the cockpit controls can be accessed by keyboard.

Ensure the following software is installed on the host:

* Linux OS (due to usage of 'host' network mode for UDP broadcast discovery)
* docker-ce - https://docs.docker.com/install/linux/docker-ce/ubuntu/
* docker-compose - https://docs.docker.com/compose/install/

Feel free to test the `install-prereqs.sh` script.  It's essentially a copy of the docker-ce/compose install steps for Linux and it sets up the docker user-defined network used by the dev environment.

# Running In Production

If you want to run a production system for field work or a tank test, use the `docker-compose.yml` file.  This file starts the minimal environment to maximize performance. It expects the physical network to match what is specified in the openrov container `start.sh` entrypoint.

0. Edit `docker-compose.yml` and set the IP address on `command:` to match the IP address of the forward camera
1. Run `docker-compose up`
2. Use Chrome to access the cockpit software at `http://<ip_of_host>`

## Be Careful with Named Volumes

Don't delete your critical data!  The production environment specified in `docker-compose.yml` uses separate named volumes from those in the `docker-compose.dev.yml` dev environment.

Brief description of key volumes:
* images - Stores individual JPEG images from all camera MJPEG streams
* logs - Stores openrov system logs, see `assets/adjustments.prod.json`
* data - Stores all system and device telemetry

Volume lables and docker config files.

# Developing SCINI Software

## Get Started Developing

** NOTE: Be cautious if creating a docker network if it conflicts with the existing LAN IP space. It probably won't work at all. **

The default `docker-compose.dev.yml` file can be used to match the network IP space used in production.  We use a docker named network to specify the appropriate subnet/gateway interfaces.  By default, on Linux, this will use the Docker libnetwork bridge driver.  All containers will be on the same layer 2 network space, identically to how things run in production.  This also ensures that certain features (like mqttclient broadcast UDP discovery) continue to work as expected.

For more info on Docker networking, see https://github.com/docker/libnetwork/blob/master/docs/bridge.md.

0. Ensure your existing local interface IP addresses are not using the same subnet/IPs specified in `docker-compose.dev.yml`
1. Edit `docker-compose.dev.yml` and ensure everything looks correct
2. Create a "user-defined" scini network to match the compose file with
  `docker network create --gateway 192.168.2.1 --subnet 192.168.2.0/24 scini`
3. Run `./start-dev.sh`
4. Open a browser and visit http://localhost to reach the forward camera and cockpit
5. Visit http://localhost:8200 - http://localhost:8204 to see the other video streams and supplemental control/telemetry interfaces
6. Open a new terminal and get a shell in the container you want to change, for example:

`docker exec -it $(docker ps |grep openrov | awk '{print $1}') /bin/bash`

7. The container uses a docker named volume created by the compose file.  You can see it with `docker volume ls`.  The named volume allows changes made in the container to persist beyond its lifetime.
8. To test your changes, either restart the entire stack by hitting <CTRL-C> in the docker-compose session, or in the second terminal execute `./stop-dev.sh` and then return to Step 3.  If you just want to restart one service, you can also run `docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart openrov`.

** NOTE: the named volume is only loaded into the openrov container to work in this environment. If you want to make changes to containers other than openrov-cockpit, be careful not to lose changes made inside the writeable, non-persistent layer of a container without a named volume. **

## Learning And Troubleshooting from the Network

The network traffic flowing between containers can be a great way to diagnose problems you might be working.

After starting the dev environent, from the host, run:

`tcpdump -i any -s0 -w debug.pcap`

After capturing some traffic, hit CTRL-C, then view the packet capture using Wireshark.  Traffic on port 3000 will show you websocket MQTT client traffic, port 1883 will show you the imgsrv-mock container MQTT traffic from `mqttclient`, port 50000 will show you the serial payloads (PRO4 protocol) flowing between the imgsrv-mock containers and serial-tester container(s).


## Using a Real Elphel Camera

If you have an Elphel 353 camera on your local network, you may use it by changing the IP address in the `command:` line of the openrov service in `docker-compose.dev.yml`.

## Workflow for OpenROV Cockpit

The primary service you will probably edit is the fork of openrov-cockpit, which serves as the interface between surface users and everything on the ROV.  One way to quickly test changes during development is to:

0. Clone a local copy of the repository from `https://github.com/mcdafydd/openrov-cockpit`.
1. Checkout the `platform/scini-dev` branch (which should be up to date with the 'master' `platform/scini` branch.
2. Follow the build steps for everything inside of /opt/openrov/cockpit specified in `openrov/Dockerfile`.  This requires local copies of things like node v6.
3. Add a bind mount volume inside of `docker-compose.dev.yml` that looks like:

`- "/path/to/your/local/openrov-cockpit:/opt/openrov/cockpit"`

4. Save your local edits and then restart the dev stack with `./stop-dev.sh && ./start-dev.sh`.

## Workflow for Other Mock Services

** Still under development **

If you find yourself wanting to edit one of the other services, for example serial-tester, here's one method to get you started:

0. Get the dev environment started as described in the previous section.
1. Stop the serial-tester container by executing `docker-compose -f docker-compose.yml -f docker-compose.dev.yml stop serial-fwd` from the scini-cockpit directory.
2. Restart the serial-fwd service with a shell using `docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --entrypoint /bin/bash serial-fwd`
3. For convenience, most of the mock containers include some basic debugging and editing tools like `lsof`, `tcpdump`, `vim`, etc.  Make some changes.
4. Restart the service the same way as it is specified in `serial-tester/Dockerfile` by running `start.sh`.
5. If you don't see any data, that could be because its dependent service `mqtt-fwd` also needs to be restarted. `docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart mqtt-fwd`.

## Debugging with Chrome DevTools

** Still under development **

The openrov entrypoint (not the scini-cockpit start-dev.sh script!) `start-dev.sh` starts node with the `--inspect` flag to enable remote debugging.  Port 9229 is exposed from the OpenROV container so that Chrome DevTools can find the instance.  This seems to work fine for debugging the OpenROV container using node v6:

* Open chrome and visit chrome://inspect
* Look for src/cockpit.js and click **Inspect**

In node v8 (ie: serial-tester), the default inspect flag in node v8 doesn't bind to 0.0.0.0 and only to localhost.  In order to use inspect while running the dev container stack, you need to either:

- Temporarily change `serial-tester/serial-tester.js` first line to read `--inspect=0.0.0.0:9222` (beware possible security issues!) and rebuild this container, or
- Forward an SSH tunnel into the container

For more info, see: https://nodejs.org/en/docs/guides/debugging-getting-started/#enabling-remote-debugging-scenarios

## Clean Up Docker

Don't forget to clean up unneeded images and containers as you're working or your disk will quickly fill up due to the large size of the openrov container.

A couple simple commands to remove containers and images older than 3 days is:

```
docker container prune --filter "until=72h"
docker image prune --filter "until=72h"
```

For more info see https://docs.docker.com/config/pruning/#prune-everything

## Imgsrv-mock Container

These containers are meant to simulate the MJPEG video functionality of the Elphel cameras.  They run a simple MJPEG HTTP server on port 8081 to simulate the Elphel imgsrv process.  OpenROV uses the mjpg_streamer input_http.so plugin to access these streams, save image data, and then serve them to openrov-cockpit browser users via websocket.

## Mqttclient-mock Container

The containers run the same MQTT client software deployed on the Elphel 353 cameras as Ethernet-to-RS485 gateways in the SCINI ROV.  The MQTT containers automatically discover the OpenROV MQTT broker and subscribe to messages sent to the toScini/* channels they need.  MQTT payloads received by the clients are immediately sent to the device specified by the USBDEVICE environment variable when the process starts.  In the mock environment, we leverage `socat` to create a virtual serial device and forward that data to a serial-tester partner container via TCP.

## Serial-tester Container

These containers use an updated version of the openrov-cockpit's pro4.js parsing module, that includes both request and response parsing as well as payload encoding, to simulate the actions of MCU modules (ie: thrusters, lights, sensors) in the ROV.  It will generate simulated telemetry to send back upstream to the OpenROV server and any connected browser users.

### Serial-tester Standalone Mode

You can run this container in standalone mode without any dependency on the rest of the scini-cockpit containers.  First:

```
nvm install v8.12.0 (or latest v8+)
nvm use v8.12.0 (if already installed)
PTY="/dev/null" STANDALONE="true" NODEIDS="11" node --inspect serial-tester.js
```

A few example hex strings (PRO4 requests) can be found in the file `testreq.pro4` .  Copy and paste a single line from that file onto stdin and hit ENTER. This will trigger the a full request parse and generation of a simulated response packet.  It will then parse the generated response packet and output the decoded object on stdout.

# Rebuilding Cached Services

If you've built the stack at least once, the cloned git repositories will be cached in that RUN layer of its container.  If you need to force Docker to pull down changes from the remote repository, remove any named volumes and then rebuild that one service.  There are helper scripts `rebuild-dev.sh` and `rebuild-dev-clean.sh` to assist with these tasks.

