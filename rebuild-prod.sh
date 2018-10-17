#!/bin/bash

# Copy latest web assets
mkdir -p openrov/www
rm openrov/www/*
cp assets/www/* openrov/www
mkdir -p openrov/www-ro
rm openrov/www-ro/*
cp assets/www-ro/* openrov/www-ro

echo "*************************"
echo "WARNING - be careful about messing with named volumes in production, you could lose valuable data!"
echo "This script only executes docker-compose down leaving named volumes in place"
echo "*************************"
docker-compose down 

echo "Rebuilding containers without pulling down git repo updates"
docker-compose build

echo
echo "When ready to restart, run ./start-prod.sh"
