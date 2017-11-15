const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();

// start up the port based on the environment it's being run in (NODE_ENV)
const environment = app.get('env');
let port;

switch (environment) {
  case 'production':
    port = 8888;
    break;
  case 'development':
    port = 9999;
    break;
  case 'local':
    port = 3333;
    break;
  default:
    console.log(
      `Not sure what to do with the environment "${environment}". Aborting...`
    );
    return;
}

// be able to parse post requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// import the routes
require('./commands/bucket')(app);
require('./commands/todo')(app);
require('./commands/review')(app);
require('./commands/complete')(app);
require('./commands/jobreport')(app);
require('./commands/bill')(app);
require('./commands/deets')(app);
require('./commands/que')(app);
require('./commands/adjust')(app);
require('./actions')(app);
require('./actions/cron')();

// setup encryption dependent on whether we're running this locally or on our server
if (environment === 'production' || environment === 'development') {
  // encrypt connections
  const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/nodesrvr.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/nodesrvr.com/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/nodesrvr.com/chain.pem')
  };

  // startup the https server
  https.createServer(sslOptions, app).listen(port, () => {
    console.log(
      `Slash commands for Sunbowl AI started listening on port ${port} [${
        environment
      } - https] at ${new Date().toString()}.`
    );
  });
} else {
  // startup the http server
  app.listen(port, () => {
    console.log(
      `Slash commands for Sunbowl AI started listening on port ${port} [${
        environment
      } - http] at ${new Date().toString()}.`
    );
  });
}
