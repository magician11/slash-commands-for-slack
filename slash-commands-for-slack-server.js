'use strict';

const express = require('express');

const PORT = 8080;

const app = express();

// import the routes
require('./commands/bucket')(app);
require('./commands/dash')(app);

// start the server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
