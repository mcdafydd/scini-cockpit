FROM node:lts-alpine
LABEL maintainer="david@linkconsultinginc.com"

RUN mkdir -p /srv/scini/mqtt-broker
COPY start.sh index.js package.json /srv/scini/mqtt-broker/
RUN chmod 755 /srv/scini/mqtt-broker/start.sh \
    && cd /srv/scini/mqtt-broker \
    && npm install
WORKDIR /srv/scini/mqtt-broker
ENTRYPOINT ["./start.sh"]
