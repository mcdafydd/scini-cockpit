#!/bin/bash

DATE=`date +%Y%m%d`
F=`which killall`

# Copy latest web assets
mkdir -p openrov/www
rm openrov/www/*
cp assets/www/* openrov/www
mkdir -p openrov/www-ro
rm openrov/www-ro/*
cp assets/www-ro/* openrov/www-ro

# Rebuild all services if $1 is empty, otherwise rebuild the specific service and pass it to 'up'

if [ -z "$1" ]; then
  # WARNING - this removes named volumes with any local changes!
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
  echo "Tagging scini/openrov:dev container as scini/openrov:build-$DATE"
  docker tag scini/openrov:dev scini/openrov:build-$DATE
else
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache $1
  if [ "$1"="openrov" ]; then
    echo "Tagging scini/openrov:dev container as scini/openrov:build-$DATE"
    docker tag scini/openrov:dev scini/openrov:build-$DATE
  fi
  if [ -x "$F" ]; then killall -q mjpg_streamer; fi
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
fi
