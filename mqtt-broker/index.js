const mdns          = require('bonjour')();
const Broker        = require('mosca');
const syslog        = require('syslog-client');
const logger        = syslog.createClient('logger');
const controllerId  = process.env['CONTROLLER_ID'] !== undefined ? process.env['CONTROLLER_ID']: 'control-bridge';

class MqttBroker {
  constructor() {
    logger.log('MQTT broker starting.');

    // Mosca objects
    this.broker = {};
    this.moscaSettings = {
      host: '0.0.0.0',
      port: 1883,
      publishNewClient: true,
      publishClientDisconnect: true,
      http: {
        port: 3000,
        stats: true // publish the stats every 10s
      }
    };

    // Start the mosca MQTT and websocket servers
    this.broker = new Broker.Server(this.moscaSettings);
    this.broker.on('ready', () => {
      logger.log('MQTT-BROKER: Servers ready for connections');
      this.broker.authorizePublish = this.authorizePublish;

      // Advertise the servers via mDNS
      logger.log('MQTT-BROKER: Advertising services via mDNS');
      mdns.publish({
        name: 'SCINI_MQTT',
        host: 'scini',
        type: 'mqtt',
        protocol: 'tcp',
        port: 1883
      });
      mdns.publish({
        name: 'OpenROV_MQTT_Websockets',
        host: 'scini',
        type: 'http',
        protocol: 'tcp',
        port: 3000
      });
      // mdns_mqtt_svc.start();
      // mdns_mqtt-ws_svc.start();
    });

    this.broker.on('clientConnected', (client) => {
      logger.log(`MQTT-BROKER: Client ${client.id} connected from IP address ${client.connection.stream.remoteAddress}`);
      let message = {
        topic: 'fromBroker/clientConnected/ipaddr',
        payload: `${client.id}:${client.connection.stream.remoteAddress}`,
        qos: 0,
        retain: false
      };
      this.broker.publish(message, () => {
        logger.log('MQTT-BROKER: Published clientConnected');
      });
    });

    this.broker.on('clientDisconnecting', (client) => {
      logger.log(`MQTT-BROKER: Client ${client.id} disconnecting`);
    });
    this.broker.on('clientDisconnected', (client) => {
      logger.log(`MQTT-BROKER: Client ${client.id} disconnected`);
    });
    this.broker.on('clientError', (err, client) => {
      logger.log(`MQTT-BROKER: Client ${client.id} error ${err}`);
    });
    this.broker.on('published', (packet, client) => {
      if (packet.topic.match('from'))
      logger.log(`MQTT-BROKER: Client ${client} published packet ID ${packet.messageId} on topic ${packet.topic}`);
    });
    this.broker.on('subscribed', (topic, client) => {
      logger.log(`MQTT-BROKER: Client ${client.id} subscribed to topic ${topic}`);
    });
    this.broker.on('unsubscribed', (topic, client) => {
      logger.log(`MQTT-BROKER: Client ${client.id} unsubscribed from topic ${topic}`);
    });
    // catch remaining events
    this.broker.on('uncaughtException', (err) => {
      logger.log('MQTT-BROKER: UNCAUGHT EXCEPTION - restarting broker:', err.message);
      this.close();
    });
  }

  authorizePublish(client, topic, payload, callback) {
    let allowed;
    if (topic.match(/fromScini\/.*/) !== null) {
      // only allow underwater clients to publish to their own topic
      allowed = client.user === topic.split('/')[1] ? true: false;
    }
    else if (topic.match(/toScini\/.*/) !== null) {
      // only allow MQTT client ID 'control-bridge' to publish to underwater subscribers
      allowed = client.user === controllerId ? true: false;
    }
    else {
      // allow all other clients/topics to publish
      allowed = true;
    }
    callback(null, allowed);
  }

  close() {
    // Stop Mosca servers
    this.broker.close(() => {
      logger.log('Mosca MQTT and websocket servers closed');
      // Unpublish mDNS services and close socket
      mdns.unpublishAll(() => {
        mdns.destroy();
      });
    });
  }
}

const server = new MqttBroker();
