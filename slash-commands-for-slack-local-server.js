const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

console.log(app.get("env"));

/*
I could do something like
https://stackoverflow.com/a/22927696/2813041
to determine if to use conversationRes

Can run like NODE_ENV=local node slash-commands-for-slack-local-server.js

*/

// import the routes
require("./commands/bucket")(app);
require("./commands/todo")(app);
require("./commands/review")(app);
require("./commands/complete")(app);
require("./commands/jobreport")(app);
require("./commands/bill")(app);
require("./commands/deets")(app);
require("./commands/que")(app);
require("./actions")(app);
require("./actions/cron")();

const PORT = 3333;

// startup the http server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Slash commands for Sunbowl AI started listening on port ${PORT} at ${new Date().toString()}.`
  );
});
