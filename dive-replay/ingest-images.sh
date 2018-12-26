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

# Create mappings
curl -XPUT 'http://localhost:9200/video-*,snapshot-*/_mapping/_doc' -H 'Content-Type: application/json' -d'
  {
    "properties": {
      "time": { "type": "date",
                "format": "yyyy_MM_dd_HH_mm_ss_SSS" },
      "filePath": { "type": "text" }
    }
  }
'

# help with quoting for JSOn body in curl
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
  device=`dirname $1 | awk -F'/' '{print $NF}'`

  if [ "$device"="pilot" ]; then
    device="215"
  fi

  # send snapshots to a different index
  if [[ $fname =~ snap_.* ]]; then
    index="snapshot-$device"
  else
    index="video-$device"
  fi

  curl -XPOST "http://localhost:9200/$index/_doc" -H 'Content-Type: application/json' -d"$(generate_body $1)"
}

export -f generate_body
export -f create_record
# Ingest all image paths and file create timestamps
find $1 -name "*.jpg" | xargs -n 1 -P 10 -I {} bash -c 'create_record "{}"'
