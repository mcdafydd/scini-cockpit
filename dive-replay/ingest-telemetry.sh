#!/bin/bash

mkdir -p /tmp/es-$$
FILES=`find $1 -type f -name '*.log'`
for FILE in $FILES; do
  # Reformat each file to be compatible with ES bulk api
  # Replace dots with dashes in field names
  # Limit lines per file to avoid out of memory errors while indexing
  sed 's/^/\{ "index": \{"_index": "telemetry", "_type" : "_doc"\} \}\n/' $FILE |\
    jq -c 'with_entries(.key |= gsub("\\."; "-"))' |\
    split --lines=5000 - /tmp/es-$$/bulk
  for BULK in `ls /tmp/es-$$/`; do
    curl -s -XPOST 'http://localhost:9200/_bulk' -H 'Content-Type: application/x-ndjson' --data-binary @"/tmp/es-$$/$BULK" -w "\n"
  done
  rm -f /tmp/es-$$/bulk*
done
rm -rf /tmp/es-$$
