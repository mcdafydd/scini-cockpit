# Overview

This project contains the container build files to create a version of OpenROV cockpit suitable to operate the SCINI underwater ROV.

# Build Container
* Install docker
* docker build -t openrov .

# Run an Instance of OpenROV
* docker run -it -p 80:80 -p 1883:1883 -p 3000:3000 -p 8080:8080 -p 8200:8200 -p 8300:8300 -p 9229:9229 openrov <IP_of_forward_Elphel_camera>
* Access the cockpit via Chrome at http://localhost, or from another system on the same LAN using the host's IP address

# Get A Shell
Presuming you're running a single instance of the container, get a shell on it by running:

`docker exec -it $(docker ps |grep openrov | awk '{print $1}') /bin/bash`

# Issues
Visit the repository of problematic components mentioned in the Dockerfile to file issues.  Only file issues with the Dockerfile here.
