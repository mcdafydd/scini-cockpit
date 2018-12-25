#!/bin/bash

# Needed to handle ES error
# max virtual memory areas vm.max_map_count [65530] likely too low, increase to at least [262144]
# sudo sysctl -w vm.max_map_count=262144

# Ingest data into elasticsearch
./ingest-images.sh /opt/openrov/images
#./ingest-telemetry.sh /opt/openrov/data
./ingest-telemetry.sh ../../scini-data/data

# Create default kibana index patterns
curl http://localhost:5601/api/saved_objects/index-pattern/video-*\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary '{ "attributes": { "title": "video-*", "timeFieldName": "@time" } }'\
    -w "\n"

curl http://localhost:5601/api/saved_objects/index-pattern/snapshot-*\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary '{ "attributes": { "title": "snapshot-*", "timeFieldName": "@time" } }'\
    -w "\n"

curl http://localhost:5601/api/saved_objects/index-pattern/telemetry\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary '{ "attributes": { "title": "telemetry", "timeFieldName": "@time" } }'\
    -w "\n"

# Set kibana defaultIndex
curl http://localhost:5601/api/kibana/settings/defaultIndex\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary '{"value":"telemetry"}'\
    -w "\n"
