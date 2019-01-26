FROM node:lts-alpine
LABEL maintainer="david@linkconsultinginc.com"

RUN mkdir -p /srv/scini/camera-config
COPY start.sh *.js package.json /srv/scini/camera-config/
RUN chmod 755 /srv/scini/camera-config/start.sh \
    && cd /srv/scini/camera-config \
    && npm install
WORKDIR /srv/scini/camera-config
ENTRYPOINT ["./start.sh"]
