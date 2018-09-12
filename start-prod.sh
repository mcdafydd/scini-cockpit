#!/bin/bash

echo "Making sure any dev containers are down"
docker-compose -f docker-compose-dev.yml down
COMPOSE_HTTP_TIMEOUT=90 docker-compose up -d
