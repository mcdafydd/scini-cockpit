#!/bin/bash

# Create mapping
curl -XPUT 'localhost:9200/images' -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "_record": {
        "properties": {
          "time": { "type": "date",
                    "format": "yyyy_MM_dd_HH_mm_ss_SSS.jpg" },
          "filePath": { "type": "text" }
        }
      }
    }
  }
'

# Ingest all telemetry data, auto-index
# Lots of files, need to break into chunks
#FILES=`find /opt/openrov/images`
#for FILE in $FILES; do
#  curl -XPOST 'http://localhost:9200/images/_record/' -H 'Content-Type: application/json' -d @${FILE}
#done

