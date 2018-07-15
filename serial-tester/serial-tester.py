#!/usr/bin/python3

import os
import random
import select
import signal
import struct
import sys
import time

def signal_handler(sig, frame):
    sys.exit(0)

def worker(content):
    serfd = os.open(os.environ['PTY'], os.O_RDWR | os.O_NONBLOCK)
    r = []
    timeout = 1

    while True:
        try:
            r, w, e = select.select([serfd],[],[], timeout)
        except:
            pass

        if r:
            data = os.read(serfd,255)
            print('PRO4 request received = ', data.hex())
            num = random.randint(0, len(content)-1)
            msg = content[num]
            os.write(serfd, bytes.fromhex(msg))
            print('PRO4 response sent = ', msg)
        # Test CT sensor
        #test = struct.pack('13s2B', '01:#059;57600', 0x0d, 0x0a)
        #test = struct.pack('7s2B', '01:#030', 0x0d, 0x0a)

if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    with open('/test.pro4') as f:
        content = f.readlines()
    content = [x.strip() for x in content] 
    worker(content)

