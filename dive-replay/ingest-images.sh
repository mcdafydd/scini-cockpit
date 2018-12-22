#!/bin/bash

# Create mapping
curl -XPUT 'localhost:9200/images' -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "_video": {
        "properties": {
          "time": { "type": "date",
                    "format": "yyyy_MM_dd_HH_mm_ss_SSS" },
          "filePath": { "type": "text" }
        }
      },
      "_snapshot": {
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
  fname=`basename $1`
  # send snapshots to a different index
  if [[ $fname =~ snap_.* ]];
    index="_snapshot"
  else
    index="_video"
  fi

  # pull timestamp to index from filename
  ts=`echo $fname | sed 's/^snap_//'`
  ts=`echo $ts | sed 's/\.jpg//'`

  json="time|filePath
$ts|$1"

  record=`jq -Rn '
  ( input  | split("|") ) as $keys |
  ( inputs | split("|") ) as $vals |
  [[$keys, $vals] | transpose[] | {key:.[0],value:.[1]}] | from_entries
  ' <<<"$json"`

  curl -XPOST "http://localhost:9200/images/${index}/" -H 'Content-Type: application/json' -d @$record
}

export -f create_record
# Ingest all image paths and file create timestamps
find /opt/openrov/images -name "*.jpg" | xargs -n 1 -P 10 -I {} bash -c 'create_record "{}"'

