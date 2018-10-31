# Standalone mode
To run this in standalone mode without any dependency on the rest of the scini-cockpit containers, `nvm use v8.12.0` or higher and use a command line like this:

`PTY="/dev/null" STANDALONE="true" NODEIDS="11" node --inspect serial-tester.js`

A few example hex strings (PRO4 requests) can be found in the file `testreq.pro4` .  Copy and paste a single line onto stdin and this will trigger the a full request parse and generation of a simulated response packet.  It will then parse the generated response packet and output the decoded object on stdout.

# TODO
Handle receivedSerialData events that send a PRO4 response instead of request.
