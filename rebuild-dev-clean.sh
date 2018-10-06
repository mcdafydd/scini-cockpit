#!/bin/bash

F=`which killall`

# Copy latest web assets
mkdir -p openrov/www
rm openrov/www/*
cp assets/www/* openrov/www

# Rebuild all services if $1 is empty, otherwise rebuild the specific service and pass it to 'up'

if [ -z "$1" ]; then
  # WARNING - this removes named volumes with any local changes!
  docker-compose -f docker-compose-dev.yml down -v
  docker-compose -f docker-compose-dev.yml build --no-cache
else
  docker-compose -f docker-compose-dev.yml build --no-cache $1
  if [ -x "$F" ]; then killall -q mjpg_streamer; fi
  docker-compose -f docker-compose-dev.yml up -d 
fi
