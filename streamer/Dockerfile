FROM node:lts-alpine
LABEL maintainer="david@linkconsultinginc.com"

## Install uWebSockets library, required for mjpg-streamer output_ws.so plugin
RUN apk --no-cache add --update cmake \
    make \
    git \
    gcc \
    build-base \
    abuild \
    binutils \
    ca-certificates \
    openssl-dev \
    libuv-dev \
    linux-headers \
    libjpeg-turbo-dev \
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
    && rm -rf /tmp/* 

RUN mkdir -p /srv/scini/streamer /srv/scini/images
COPY start.sh *.js package.json /srv/scini/streamer/
RUN chmod 755 /srv/scini/streamer/start.sh \
    && cd /srv/scini/streamer \
    && npm install
WORKDIR /srv/scini/streamer
ENTRYPOINT ["./start.sh"]
