# Overview

This repository contains the Dockerfiles necessary to build a test SCINI ROV
for development.

# Getting Started

Running a test SCINI is under development.

* You should already have docker or docker-ce installed
* Install docker-compose from latest or from OS repository (if it is recent and support compose file format 3+) - https://docs.docker.com/compose/install/
* Create a "user-defined" scini network to match the compose file with
  `docker network create --gateway 192.168.2.1 --subnet 192.168.2.0/24 scini`
* Run `docker-compose up`
* Open a browser and visit http://localhost
