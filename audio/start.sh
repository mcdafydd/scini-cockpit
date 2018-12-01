#!/bin/sh

# First, killall any existing arecord commands
curl http://192.168.2.215/phpshell.php?command=killall%20arecord

# Then, start new session
curl http://192.168.2.215/phpshell.php?command=arecord%20-t%20raw%20-f%20S16_LE%20-r%208000%20-c%201%20|%20nc%20-u%20192.168.1.65%2012345%20%26

websocat --binary ws-l:0.0.0.0:20000 -E udp-listen:0.0.0.0:12345

#nc -l -p 12345 -u | aplay -r 8000 -t wav -f S16_LE -c 1

