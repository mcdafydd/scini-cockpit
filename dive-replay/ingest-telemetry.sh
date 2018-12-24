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
      "board44.pressure.81": { "type": "float" },
      "depth_d": { "type": "float" },
      "board44.depth.81": { "type": "float" },
      "depth_t": { "type": "float" },
      "board44.temp.81": { "type": "float" },
      "imu_p": { "type": "float" },
      "imu_r": { "type": "float" },
      "sensors.imuPressure.51": { "type": "float" },
      "pilot.imuPressure.52": { "type": "float" },
      "sensors.imuPressure.57": { "type": "float" },
      "sensors.imuPressure.58": { "type": "float" },
      "sensors.imuPressure.67": { "type": "float" },
      "sensors.imuTemp.51": { "type": "float" },
      "pilot.imuTemp.52": { "type": "float" },
      "sensors.imuTemp.57": { "type": "float" },
      "sensors.imuTemp.58": { "type": "float" },
      "sensors.imuTemp.67": { "type": "float" },
      "light.bus_i.61": { "type": "float" },
      "light.bus_i.62": { "type": "float" },
      "light.bus_i.63": { "type": "float" },
      "light.bus_i.65": { "type": "float" },
      "light.bus_i.66": { "type": "float" },
      "light.bus_v.61": { "type": "float" },
      "light.bus_v.62": { "type": "float" },
      "light.bus_v.63": { "type": "float" },
      "light.bus_v.65": { "type": "float" },
      "light.bus_v.66": { "type": "float" },
      "light.temp.61": { "type": "float" },
      "light.temp.62": { "type": "float" },
      "light.temp.63": { "type": "float" },
      "light.temp.65": { "type": "float" },
      "light.temp.66": { "type": "float" },
      "motors.bus_i.12": { "type": "float" },
      "motors.bus_i.13": { "type": "float" },
      "motors.bus_i.14": { "type": "float" },
      "motors.bus_i.15": { "type": "float" },
      "motors.bus_i.16": { "type": "float" },
      "motors.bus_v.12": { "type": "float" },
      "motors.bus_v.13": { "type": "float" },
      "motors.bus_v.14": { "type": "float" },
      "motors.bus_v.15": { "type": "float" },
      "motors.bus_v.16": { "type": "float" },
      "motors.temp.12": { "type": "float" },
      "motors.temp.13": { "type": "float" },
      "motors.temp.14": { "type": "float" },
      "motors.temp.15": { "type": "float" },
      "motors.temp.16": { "type": "float" },
      "motors.rpm.12": { "type": "float" },
      "motors.rpm.13": { "type": "float" },
      "motors.rpm.14": { "type": "float" },
      "motors.rpm.15": { "type": "float" },
      "motors.rpm.16": { "type": "float" },
      "motors.lift": { "type": "float" },
      "motors.pitch": { "type": "float" },
      "motors.strafe": { "type": "float" },
      "motors.throttle": { "type": "float" },
      "motors.yaw": { "type": "float" },
      "board44.temp.85": { "type": "float" },
      "board44.conductivity.85": { "type": "float" },
      "gripper.temp.23": { "type": "float" },
      "waterSampler.temp.21": { "type": "float" },
      "trim.temp.24": { "type": "float" },
      "gripper.current.23": { "type": "float" },
      "waterSampler.current.21": { "type": "float" },
      "trim.current.24": { "type": "float" },
      "board44.acs764n1.83": { "type": "float" },
      "board44.acs764n2.83": { "type": "float" },
      "board44.acs764n3.83": { "type": "float" },
      "board44.acs764n4.83": { "type": "float" },
      "board44.adc2.83": { "type": "float" },
      "board44.adc4.83": { "type": "float" },
      "board44.adc5.83": { "type": "float" },
      "board44.adc6.83": { "type": "float" },
      "board44.adc1.83": { "type": "float" },
      "board44.adc7.83": { "type": "float" },
      "board44.acs764n1.87": { "type": "float" },
      "board44.acs764n2.87": { "type": "float" },
      "board44.acs764n3.87": { "type": "float" },
      "board44.acs764n4.87": { "type": "float" },
      "board44.adc2.87": { "type": "float" },
      "board44.adc4.87": { "type": "float" },
      "board44.adc5.87": { "type": "float" },
      "board44.adc6.87": { "type": "float" },
      "board44.adc1.87": { "type": "float" },
      "board44.adc7.87": { "type": "float" },
      "mqtt.error.elphel-000e64081e1f": { "type": "float" },
      "mqtt.error.elphel-000e64081ccd": { "type": "float" },
      "mqtt.error.elphel-000e64081ce3": { "type": "float" },
      "mqtt.error.elphel-000e64081e1e": { "type": "float" },
      "mqtt.timeout.elphel-000e64081e1f": { "type": "float" },
      "mqtt.timeout.elphel-000e64081ccd": { "type": "float" },
      "mqtt.timeout.elphel-000e64081ce3": { "type": "float" },
      "mqtt.timeout.elphel-000e64081e1e": { "type": "float" }
    }
  }
'

FILES=`find /opt/openrov/data -type f -name '*.log'`
for FILE in $FILES; do
  # Reformat each file to be compatible with ES bulk api
  sed 's/^/\{ "index": \{"_index": "telemetry", "_type" : "_doc"\} \}\n/' $FILE > /tmp/$$.json
  echo >> /tmp/$$.json
  curl -XPOST 'http://localhost:9200/_bulk' -H 'Content-Type: application/x-ndjson' --data-binary @"/tmp/$$.json"
  rm /tmp/$$.json
done

