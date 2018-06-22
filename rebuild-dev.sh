#!/bin/bash

# WARNING - removes named volumes with any local changes!
docker-compose -f docker-compose-dev.yml down -v

docker-compose -f docker-compose-dev.yml build
