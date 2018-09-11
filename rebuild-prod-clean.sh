#!/bin/bash

echo "*************************"
echo "WARNING - be careful about messing with named volumes in production, you could lose valuable data!"
echo "This script only executes docker-compose down leaving named volumes in place"
echo "*************************"
docker-compose down 

echo "Rebuilding containers from scratch, including git repo updates."
docker-compose build --no-cache

echo
echo "When ready to restart, run ./start-prod.sh"
