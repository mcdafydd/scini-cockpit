#!/bin/bash

# Create the index
curl -XPUT 'http://localhost:9200/telemetry'

# Create mapping
curl -XPUT 'http://localhost:9200/telemetry/_mapping/_doc' -H 'Content-Type: application/json' -d'
  {
    "properties": {
      "pid": { "type": "integer" },
      "hostname": { "type": "text" },
      "level": { "type": "integer" },
      "awake": { "type": "text" },
      "v": { "type": "integer" },
      "msg": { "type": "text" },
      "cmd": { "type": "text" },
      "time": { "type":   "date",
                "format": "strict_date_optional_time||epoch_millis" },
      "cpu": { "type": "float" },
      "depth_p": { "type": "float" },
      "depth_d": { "type": "float" },
      "depth_t": { "type": "float" },
      "imu_p": { "type": "float" },
      "imu_poff": { "type": "float" },
      "imu_r": { "type": "float" },
      "imu_roff": { "type": "float" },
      "camServ_inv": { "type": "float" },
      "camServ_spd": { "type": "float" },
      "motors.lift": { "type": "float" },
      "motors.pitch": { "type": "float" },
      "motors.strafe": { "type": "float" },
      "motors.throttle": { "type": "float" },
      "motors.yaw": { "type": "float" },
      "gripper.temp.23": { "type": "float" },
      "gripper.current.23": { "type": "float" },
      "gripper.close": { "type": "integer" },
      "gripper.open": { "type": "integer" },
      "waterSampler.temp.21": { "type": "float" },
      "waterSampler.current.21": { "type": "float" },
      "sampler.close": { "type": "integer" },
      "sampler.open": { "type": "integer" },
      "trim.temp.24": { "type": "float" },
      "trim.current.24": { "type": "float" },
      "trim.close": { "type": "integer" },
      "trim.open": { "type": "integer" }
    }
  }
'
# Create dynamic mappings
curl -XPUT 'http://localhost:9200/telemetry/_mapping/_doc' -H 'Content-Type: application/json' -d'
  {
    "dynamic_templates": [
      {
        "camera_properties": {
          "match_pattern": "regex",
          "match": "^camera\.\d+\..+$"
          "mapping": {
            "type": "integer"
          }
        }
      },
      {
        "board44_template": {
          "match_pattern": "regex",
          "match": "^board44\..+\.\d+$"
          "mapping": {
            "type": "float"
          }
        }
      },
      {
        "motors_template": {
          "match_pattern": "regex",
          "match": "^motors\..+\.\d+$"
          "mapping": {
            "type": "float"
          }
        }
      },
      {
        "sensors_template": {
          "match_pattern": "regex",
          "match": "^sensors\..+\.\d+$"
          "mapping": {
            "type": "float"
          }
        }
      },
      {
        "pilot_template": {
          "match_pattern": "regex",
          "match": "^pilot\..+\.\d+$"
          "mapping": {
            "type": "float"
          }
        }
      },
      {
        "light_template": {
          "match_pattern": "regex",
          "match": "^light\..+\.\d+$"
          "mapping": {
            "type": "float"
          }
        }
      },
      {
        "mqtt_counters": {
          "match": "mqtt.*.*",
          "mapping": {
            "type": "integer"
          }
        }
      }
    ]
  }
'

mkdir -p /tmp/es-$$
FILES=`find $1 -type f -name '*.log'`
for FILE in $FILES; do
  # Reformat each file to be compatible with ES bulk api
  # Limit lines per file to avoid out of memory errors while indexing
  sed 's/^/\{ "index": \{"_index": "telemetry", "_type" : "_doc"\} \}\n/' $FILE |\
    split --lines=5000 - /tmp/es-$$/bulk
  for BULK in `ls /tmp/es-$$/`; do
    curl -XPOST 'http://localhost:9200/_bulk' -H 'Content-Type: application/x-ndjson' --data-binary @"/tmp/es-$$/$BULK" -w "\n"
  done
  rm -f /tmp/es-$$/bulk*
done
rm -rf /tmp/es-$$
