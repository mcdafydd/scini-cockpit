FROM ubuntu:18.04
LABEL maintainer="david@linkconsultinginc.com"
SHELL ["/bin/bash", "-c"]

## Install dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        make \
        git \
        libssl-dev \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && git clone https://github.com/eclipse/paho.mqtt.c \
    && git clone https://github.com/mcdafydd/elphel-mqtt-client

RUN cd paho.mqtt.c \
    && git checkout v1.2.0 \
    && make install

RUN cd ../elphel-mqtt-client \
    && make install

EXPOSE 1883
EXPOSE 3000

## Start the mock server platform (no external camera)
WORKDIR /srv/
ENTRYPOINT ["/usr/local/bin/mqttclient"]

