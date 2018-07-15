FROM ubuntu:18.04
LABEL maintainer="david@linkconsultinginc.com"
SHELL ["/bin/bash", "-c"]

## Install dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash-completion \
        curl \
        git \
        lsof \
        net-tools \
        nmap \
        python3 \
        socat \
        tcpdump \
        vim \
        wget \
    && rm -rf /var/lib/apt/lists/*

COPY serial-tester.py /usr/local/bin/
COPY start.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/serial-tester.py /usr/local/bin/start.sh

## Start the mock server platform (no external camera)
WORKDIR /srv/
ENTRYPOINT ["/usr/local/bin/start.sh"]
