FROM node:lts-alpine
LABEL maintainer="david@linkconsultinginc.com"

## Install uWebSockets library, required for mjpg-streamer output_ws.so plugin
RUN apk --no-cache add --update git ca-certificates \
    && cd /tmp \
    && git clone https://github.com/mcdafydd/uWebSockets.git \
    && cd uWebSockets \
    && mkdir -p build \
    && cd build \
    && cmake .. \
    && make \
    && make install

## Install our branch of mjpg-streamer
RUN cd /tmp \
    && git clone https://github.com/mcdafydd/mjpg-streamer.git \
    && cd mjpg-streamer \
    && git checkout platform/scini \
    && sed 's/^#\ Compiler\ flags/#\ Compiler\ Flags\nadd_definitions\(-DUSE_LIBUV\)\n/' CMakeLists.txt > /tmp/tmp.$$ \
    && mv /tmp/tmp.$$ CMakeLists.txt \
    && mkdir -p build \
    && cd build \
    && cmake .. \
    && make \
    && make install \
    && rm -rf /tmp/* \
    && mkdir -p /srv/scini/camera-config

COPY start.sh *.js package.json /srv/scini/camera-config
RUN chmod 755 /srv/scini/camera-config/start.sh \
    && cd /srv/scini/camera-config \
    && npm install
WORKDIR /srv/scini/camera-config
ENTRYPOINT ["./start.sh"]
