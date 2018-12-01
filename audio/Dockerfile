FROM alpine:3.8
LABEL maintainer="david@linkconsultinginc.com"
RUN apk add --no-cache curl && \
    curl -o /usr/bin/websocat -L https://github.com/vi/websocat/releases/download/v1.2.0/websocat_nossl_amd64-linux-static 
COPY start.sh /usr/bin/ 
RUN chmod 755 /usr/bin/websocat /usr/bin/start.sh 
WORKDIR /srv/
EXPOSE 20000/tcp
EXPOSE 12345/udp
ENTRYPOINT ["/usr/bin/start.sh"] 

