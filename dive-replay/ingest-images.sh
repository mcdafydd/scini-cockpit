#!/bin/bash

# Create the two indices
curl -XPUT "http://localhost:9200/video"
curl -XPUT "http://localhost:9200/snapshot"

# Create mappings
curl -XPUT 'http://localhost:9200/video,snapshot/_mapping/_doc' -H 'Content-Type: application/json' -d'
  {
    "properties": {
      "time": { "type": "date",
                "format": "yyyy_MM_dd_HH_mm_ss_SSS" },
      "filePath": { "type": "text" }
    }
  }
'

generate_body() {
  fname=`basename $1`
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

  echo $record
}

create_record() {
  fname=`basename $1`
  # send snapshots to a different index
  if [[ $fname =~ snap_.* ]]; then
    index="snapshot"
  else
    index="video"
  fi

  curl -XPOST "http://localhost:9200/$index/_doc" -H 'Content-Type: application/json' -d"$(generate_body $1)"
}

export -f generate_body
export -f create_record

# If low on storage, may need to allow read-write before indexing
curl -XPUT 'localhost:9200/_settings' -H 'Content-Type: application/json' -d'
  {
    "index": {
      "blocks": {
        "read_only_allow_delete": "false"
      }
    }
  }
'
curl -XPUT 'localhost:9200/video/_settings' -H 'Content-Type: application/json' -d'
  {
    "index": {
      "blocks": {
        "read_only_allow_delete": "false"
      }
    }
  }
'

# Ingest all image paths and file create timestamps
find /opt/openrov/images -name "*.jpg" | xargs -n 1 -P 10 -I {} bash -c 'create_record "{}"'

