const express = require('express');

const PORT = 5555;

const app = express();

// import the routes
require('./commands/bucket')(app);
require('./commands/todo')(app);
require('./commands/review')(app);
require('./commands/go')(app);
require('./commands/complete')(app);

// start the server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
