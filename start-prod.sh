#!/bin/bash

echo "Making sure any dev containers are down"
docker-compose -f docker-compose-dev.yml down
docker-compose up -d
