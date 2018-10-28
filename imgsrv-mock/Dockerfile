FROM ubuntu:18.04
LABEL maintainer="david@linkconsultinginc.com"
SHELL ["/bin/bash", "-c"]
STOPSIGNAL SIGINT

## Install dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash-completion \
        build-essential \
        ca-certificates \
        curl \
        gcc \
        git \
        libssl-dev \
        lsof \
        make \
        net-tools \
        nmap \
        python \
        socat \
        tcpdump \
        vim \
        wget \
    && git clone https://github.com/eclipse/paho.mqtt.c \
    && git clone https://github.com/mcdafydd/elphel-mqtt-client \
    && curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash \
    && rm -rf /var/lib/apt/lists/*

## Install node+nvm
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 8.12.0
ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN source /root/.nvm/nvm.sh \
    && nvm install v$NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default \
    && echo It should end saying something like "Now using node $LATEST (npm v3.10.10)"

RUN cd paho.mqtt.c \
    && git checkout v1.2.0 \
    && make install

RUN cd ../elphel-mqtt-client \
    && make install

COPY start.sh mjpeg-server.py http-server.js /usr/bin/
COPY images /srv/images
RUN chmod 755 /usr/bin/start.sh /usr/bin/mjpeg-server.py /usr/bin/http-server.js

EXPOSE 80
EXPOSE 1883
EXPOSE 3000
EXPOSE 8081

## Start the mock server platform (no external camera)
WORKDIR /srv/
ENTRYPOINT ["start.sh"]



