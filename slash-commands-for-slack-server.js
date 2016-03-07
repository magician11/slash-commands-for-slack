'use strict';

// include the required modules for the server
let express = require('express');

// constants
const PORT = 8080;

// console.log(FRESHBOOKS_API_URL, FRESHBOOKS_AUTH_KEY, SLACK_TOKEN, FORMSTACK_TOKEN);

let app = express();

// import the routes
require('./commands/bucket')(app);

// start the server
app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});
