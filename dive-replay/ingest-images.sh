#!/bin/bash

# Create mapping
curl -XPUT 'localhost:9200/images' -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "_record": {
        "properties": {
          "time": { "type": "date",
                    "format": "yyyy_MM_dd_HH_mm_ss_SSS" },
          "filePath": { "type": "text" }
        }
      }
    }
  }
'

create_record() {
  fname=`basename $1 | sed 's/\.jpg//'`

  json="time|filePath
$fname|$1"

  record=`jq -Rn '
  ( input  | split("|") ) as $keys |
  ( inputs | split("|") ) as $vals |
  [[$keys, $vals] | transpose[] | {key:.[0],value:.[1]}] | from_entries
  ' <<<"$json"`

  curl -XPOST 'http://localhost:9200/images/_record/' -H 'Content-Type: application/json' -d @$record
}

export -f create_record
# Ingest all image paths
find /opt/openrov/images -name "*.jpg" | xargs -n 1 -P 10 -I {} bash -c 'create_record "{}"'

