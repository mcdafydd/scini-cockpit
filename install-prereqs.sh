#!/bin/bash
#
# Simple copy of commands from docs.docker.com linked in README.md to speed up
# prerequisite install (for Ubuntu)
#
# Install the latest stable channel of docker-ce and docker-compose
#
# https://docs.docker.com/install/linux/docker-ce/ubuntu
# https://docs.docker.com/compose/install
#
#
# https://docs.docker.com/install/linux/linux-postinstall/#manage-docker-as-a-non-root-user
#
echo "Be sure to read https://docs.docker.com/install/linux/linux-postinstall/#manage-docker-as-a-non-root-user before continuing"
echo "Make sure you understand that this script uses sudo and grants your userId access to the docker group with root level privilieges"
read -n 1 -s -r -p "Press any key if you're sure you want to continue"

sudo apt-get remove docker docker-engine docker.io
sudo apt-get update
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    jq \
    software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo apt-key fingerprint 0EBFCD88
echo "Make sure the key above looks right before continuing"
sleep 3
read -n 1 -s -r -p "Press any key to continue"
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
sudo apt-get update
sudo apt-get install docker-ce

echo "Adding $USER to the docker group"
sudo groupadd docker
sudo usermod -aG docker $USER # should already exist
echo "Running hello-world docker container"
docker run hello-world

echo "Docker hello-world should have run successfully"
echo "Check https://github.com/docker/compose/releases to verify it's the latest version"
read -n 1 -s -r -p "Press any key to continue installing docker-compose"

sudo curl -L https://github.com/docker/compose/releases/download/1.22.0/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "Creating scini docker network to run the dev compose containers"
docker network create --gateway 192.168.2.1 --subnet 192.168.2.0/24 scini
