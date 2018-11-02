# Tests
Add some tests.  

* Looking at Jest for the `assets/www` platform
* Maybe some integration or end-to-end tests in `serial-tester` using a fake mqtt client that sends a lot of valid and invalid requests through the openrov broker and looks for correct output to arrive at the device simulator and responses back to the client

# serial-tester
* Handle receivedSerialData events that send a PRO4 response instead of request.
* Handle RangeError for Board44Bam response messages in standalone mode
