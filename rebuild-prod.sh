#!/bin/bash

# WARNING - removes named volumes with any local changes!
docker-compose down -v

docker-compose build
