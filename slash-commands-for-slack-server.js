const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();

// import the routes
require('./commands/bucket')(app);
require('./commands/todo')(app);
require('./commands/review')(app);
require('./commands/go')(app);
require('./commands/complete')(app);
require('./commands/jobreport')(app);
require('./commands/bill')(app);
require('./commands/deets')(app);
require('./commands/que')(app);

const PORT = 8888;

// Connections are encrypted
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/nodesrvr.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/nodesrvr.com/fullchain.pem'),
  ca: fs.readFileSync('/etc/letsencrypt/live/nodesrvr.com/chain.pem')
};

// startup the https server
https.createServer(sslOptions, app).listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Slash commands for Sunbowl AI started listening on port ${PORT} at ${new Date().toString()}.`
  );
});
