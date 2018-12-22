# Review video and telemetry from previous dives

1. Script to ingest JSON data into elasticsearch 'telemetry' index - `curl -XPOST 'http://<hostname>:9200/test/test/1' -d @filename.json
2. Script to create 'images' index linking timestamp from MJPEG image filenames to location in docker volume
3. Web app to view dives and request 10-second buffers of both images and telemetry and view them on a canvas with basic display controls

