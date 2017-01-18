const express = require('express');


// changed port for dev setup
const PORT = 7777;

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

// start the server
app.listen(PORT, () => {
  // eslint-disable-next-line
  console.log(`Listening on port ${PORT}`);
});
