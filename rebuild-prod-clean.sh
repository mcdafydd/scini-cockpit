#!/bin/bash

DATE=`date +%Y%m%d`

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
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down 

echo "Rebuilding openrov container from scratch, including git repo updates."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache openrov 
echo "Tagging scini/openrov:dev container as scini/openrov:build-$DATE"
docker tag scini/openrov:dev scini/openrov:build-$DATE
echo "Pushing to Docker Hub"
docker push scini/openrov:build-$DATE
echo
echo "When ready to restart, run ./start-prod.sh"
