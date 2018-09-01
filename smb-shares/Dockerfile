FROM ubuntu:18.04
LABEL maintainer="david@linkconsultinginc.com"
SHELL ["/bin/bash", "-c"]

## Install dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash-completion \
        ca-certificates \
        curl \
        git \
        lsof \
        net-tools \
        nmap \
        tcpdump \
        vim \
        samba \
        wget \
    && rm -rf /var/lib/apt/lists/*

COPY smb.conf /etc/samba/smb.conf

EXPOSE 137/udp
EXPOSE 138/udp
EXPOSE 139
EXPOSE 445

ENTRYPOINT ["/bin/bash"]
