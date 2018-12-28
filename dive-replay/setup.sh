#!/bin/bash

# Create the indices
curl -XPUT "http://localhost:9200/video-211"
curl -XPUT "http://localhost:9200/video-213"
curl -XPUT "http://localhost:9200/video-215"
curl -XPUT "http://localhost:9200/video-217"
curl -XPUT "http://localhost:9200/video-218"
curl -XPUT "http://localhost:9200/snapshot-211"
curl -XPUT "http://localhost:9200/snapshot-213"
curl -XPUT "http://localhost:9200/snapshot-215"
curl -XPUT "http://localhost:9200/snapshot-217"
curl -XPUT "http://localhost:9200/snapshot-218"
curl -XPUT 'http://localhost:9200/telemetry'

# Create field mappings
curl -XPUT 'http://localhost:9200/video-*,snapshot-*/_mapping/_doc' -H 'Content-Type: application/json' --data-binary @setup-images.mappings.json
curl -XPUT 'http://localhost:9200/telemetry/_mapping/_doc' -H 'Content-Type: application/json' --data-binary @setup-telemetry.mappings.json

# Ingest data into elasticsearch
./ingest-images.sh /opt/openrov/images
./ingest-telemetry.sh /opt/openrov/data

# Create default kibana index patterns
curl -XPOST http://localhost:5601/api/saved_objects/index-pattern/video-*\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary @setup-video.kibana.json\
    -w "\n"

curl -XPOST http://localhost:5601/api/saved_objects/index-pattern/snapshot-*\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary @setup-snapshot.kibana.json\
    -w "\n"

curl -XPOST http://localhost:5601/api/saved_objects/index-pattern/telemetry\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary @setup-telemetry.kibana.json\
    -w "\n"

# Set kibana defaultIndex
curl -XPOST http://localhost:5601/api/kibana/settings/defaultIndex\
    -H "Content-Type: application/json"\
    -H "Accept: application/json, text/plain, */*"\
    -H "kbn-xsrf: true"\
    --data-binary '{"value":"telemetry"}'\
    -w "\n"
