#!/bin/bash

# Ingest data into elasticsearch
./ingest-images.sh
./ingest-telemetry.sh

# Create default kibana index patterns
curl localhost:5601/es_admin/.kibana/index-pattern/video/_create\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: video"\
    --data-binary '{"title":"video","timeFieldName":"time"}'  -w "\n"

curl localhost:5601/es_admin/.kibana/index-pattern/telemetry/_create\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: telemetry"\
    --data-binary '{"title":"telemetry","timeFieldName":"time"}'  -w "\n"

