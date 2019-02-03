# Review video and telemetry from previous dives

1. Script to ingest dive telemetry data and timestamps
2. Script to ingest dive image file paths and timestamps
3. Web app to view dives and request buffers of both images and telemetry and view them on a canvas with basic display controls
4. Kibana charts
5. Methods to export/update/re-index/share data

# How-to
1. Put your image data into /opt/openrov/images
2. Put your telemetry data into /opt/openrov/data
3. Start the Elasticsearch/Kibana cluster
4. Run ./setup.sh from the container directory
5. After completion, navigate to Kibana at http://localhost:5601
6. Click Management -> Index Patterns and select the star icon for the `tel*` index to set it as the default
7. Increase max buckets for timelion to 20000: Kibana -> Management -> Advanced Settings -> timelion:max_buckets
8. Search away!

