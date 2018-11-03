# docker-syslog-ng-sidecar
# Ref: https://github.com/aknuds1/docker-syslog-ng-sidecar.git

Dockerfile for syslog-ng to run in a sidecar container logging to stdout. The purpose of this
Dockerfile is to build a Docker image that runs in a sidecar container, forwarding logs
from the main container to stdout so Kubernetes can pick up the logs.
