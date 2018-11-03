#!/bin/bash

# Copy latest web assets if needed in case then container tries to build
if [ ! -d "openrov/www" ]; then
  mkdir -p openrov/www
  rm openrov/www/*
  cp assets/www/* openrov/www
  mkdir -p openrov/www-ro
  rm openrov/www-ro/*
  cp assets/www-ro/* openrov/www-ro
fi

# Get timestamp of current container from compose base file
CURRENT=`grep scini/openrov docker-compose.yml | awk -F'build-' '{print $2}'`
CURRENTVER=`date -d $CURRENT +%s`
echo "Current version in docker-compose.yml is $CURRENT."

# Compare with all build-<date> tagged versions on docker hub
REMOTEVERS=`curl -s https://registry.hub.docker.com/v1/repositories/scini/openrov/tags | jq '.[] | {name} | .name' | sed 's/build-//'`
if [ -n "$CURRENTVER" -a -n "$REMOTEVERS" ]; then
  for VER in $REMOTEVERS; do
    VER=`echo $VER | sed 's/"//g'`
    D=`date -d $VER +%s 2> /dev/null`
    if [ -z "$D" ]; then
      D=0
    fi
    if [ "$D" -gt "$CURRENTVER" ]; then
      echo "*******************"
      echo "Newer container version build-$VER available in Docker Hub."
      echo "Change this value in docker-compose.yml and re-run start-prod.sh"
      echo "if you want to use it."
      echo "*******************"
    fi
  done
fi

echo "Making sure any dev containers are down"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
COMPOSE_HTTP_TIMEOUT=90 docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

