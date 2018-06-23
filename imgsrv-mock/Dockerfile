FROM ubuntu:18.04
LABEL maintainer="david@linkconsultinginc.com"
SHELL ["/bin/bash", "-c"]
STOPSIGNAL SIGINT

## Install dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python \
    && rm -rf /var/lib/apt/lists/*

COPY mjpeg-server.py /usr/bin
COPY images /srv/images
RUN chmod 755 /usr/bin/mjpeg-server.py

EXPOSE 8081

## Start the mock server platform (no external camera)
WORKDIR /srv/
ENTRYPOINT ["mjpeg-server.py"]
CMD ["8081"]
