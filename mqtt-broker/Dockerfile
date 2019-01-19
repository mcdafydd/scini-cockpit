FROM node:lts-alpine
LABEL maintainer="david@linkconsultinginc.com"

RUN mkdir -p /srv/mqtt-broker
COPY start.sh index.js package.json /srv/mqtt-broker/
RUN chmod 755 /srv/mqtt-broker/start.sh \
    && cd /srv/mqtt-broker \
    && npm install
WORKDIR /srv/mqtt-broker
ENTRYPOINT ["./start.sh"]
