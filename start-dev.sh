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

docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
