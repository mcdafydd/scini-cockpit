# Issues
* change human interaction Elphel buttons from setparameters_demo to parsedit.php - safer, provides feedback when parameter is wrong
* reduce container sizes - use dive, multi-stage builds
* better way to locally browse images - using named volumes on host prevent simple host file explorer access

# Tests
More tests!

* Test rapid removal and adding of mqtt master clients
* Log uncaughtExceptions in openrov and die
* Change dev stack to die openrov instead of restart - we need to make those bugs more visible in testing
* Add lots of inter-message noisy data - simulate an unbiased/noisy RS485 bus inbetween packets.  See sample data in recent logs.
* Looking at Jest for the `assets/www` platform
* Maybe some integration or end-to-end tests in `serial-tester` using a fake mqtt client that sends a lot of valid and invalid requests through the openrov broker and looks for correct output to arrive at the device simulator and responses back to the client
* Join MQTT broker and publish messages that can validate co-pilot functions

# imgsrv-mock
* Add support for testing snapfull control
* Add support for testing getCamSettings - simulate parsedit.php and setparameters_demo.php by echoing back expected output

# serial-tester
* Handle receivedSerialData events that send a PRO4 response instead of request.
* Handle RangeError for Board44Bam response messages in standalone mode
