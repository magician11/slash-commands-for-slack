/*
Slash command for Sunbowl
Add a task to their trello card
*/

module.exports = app => {
  const formstackSunbowl = require("../modules/formstack");
  const trelloSunbowl = require("../modules/trello");
  const slackSunbowl = require('../modules/slack');
  const utils = require("../modules/utils");
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post("/todo", (req, res) => {
    const { text, token, channel_name, response_url } = req.body;
    const task = text;

    // check to see whether this script is being accessed from our slack apps
    if (
      token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError("Access denied.", res);
      return;
    } else if (text === "") {
      utils.respondWithError(
        "No task was specified. Usage: /todo [the task you want to add]",
        res
      );
      return;
    }

    res.json({
      text: "Ok adding that for you now..."
    });

    formstackSunbowl
      .getTrelloCardId(channel_name)
      .then(trelloSunbowl.getTaskListId)
      .then(taskListId => trelloSunbowl.addTask(taskListId, task))
      .then(() => {
        slackSunbowl.postToSlack(
          { text: `Great! Your task *${task}* was added.` },
          response_url
        );
      })
      .catch(error => {
        utils.respondWithError(error, res);
      });
  });
};
