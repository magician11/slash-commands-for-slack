'use strict';

let express = require('express');

const PORT = 8080;

let app = express();

// import the routes
require('./commands/bucket')(app);
require('./commands/task')(app);

// start the server
app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});
