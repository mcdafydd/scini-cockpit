#!/bin/bash

# Rebuild all services if $1 is empty, otherwise rebuild the specific service and pass it to 'up'

if [ -z "$1" ]; then
  # WARNING - this removes named volumes with any local changes!
  docker-compose -f docker-compose-dev.yml down -v
  docker-compose -f docker-compose-dev.yml build --no-cache
else
  docker-compose -f docker-compose-dev.yml build $1 --no-cache
  docker-compose -f docker-compose-dev.yml up -d 
fi
