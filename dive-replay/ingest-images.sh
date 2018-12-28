#!/bin/bash

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

  curl -s -XPOST "http://localhost:9200/$index/_doc" -H 'Content-Type: application/json' -d"$(generate_body $1)"
}

export -f generate_body
export -f create_record
# Ingest all image paths and file create timestamps
find $1 -name "*.jpg" | xargs -n 1 -P 10 -I {} bash -c 'create_record "{}"'
