# Mqtt-broker

This service starts a Mosca MQTT broker for service-to-service communication. It:

- Publishes client IP addresses upon connection to broker on topic `fromBroker/clientConnected/ipaddr`
- Publishes MQTT client IDs on connect/disconnect using builtin Mosca $SYS messages
- Emits a broadcast UDP packet on port 5000 to facilitate discovery by the MQTT-serial bridges underwater
- Restricts MQTT publish for toScini/# topics to a single MQTT client ID for control loop service
- Restricts MQTT publish for `fromScini/elphel-<macaddr>` topic to MQTT client ID that matches `elphel-<macaddr>`

Configuration:

Environment variable "CONTROLLER_ID" specifies the MQTT client ID that is allowed to publish to the `toScini/#` topic tree (default = `control-bridge`)