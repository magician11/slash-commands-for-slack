/*
Slash command for Sunbowl
Add a task to their trello card
*/

module.exports = app => {
  const moment = require("moment");
  const formstackSunbowl = require("../modules/formstack");
  const sunbowlFirebase = require("../modules/firebase");
  const trelloSunbowl = require("../modules/trello");
  const slackSunbowl = require("../modules/slack");
  const utils = require("../modules/utils");
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post("/todo", async (req, res) => {
    const { text, token, channel_name, response_url, user_name } = req.body;
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

    try {
      const trelloCardId = await formstackSunbowl.getTrelloCardId(channel_name);
      const listNameItsOn = await trelloSunbowl.getListNameForCard(
        trelloCardId
      );

      const listTheCardMustBeOn = "Pending to be assigned";

      if (listNameItsOn !== listTheCardMustBeOn) {
        throw `To add tasks they need to be on the "${listTheCardMustBeOn}" list. It's currently on the "${listNameItsOn}" list.\nFirst do */que start*`;
        return;
      }

      const taskListId = await trelloSunbowl.getTaskListId(trelloCardId);

      /*
        If this is the first task to be added, log this time.
      */
      const taskList = await trelloSunbowl.getTaskListItems(taskListId);
      if (taskList.length === 0) {
        const thisMoment = new moment();

        sunbowlFirebase.updateObject(
          `logs/${user_name}/${thisMoment.format("DDMMYYYY")}`,
          channel_name,
          { firstTodoAdded: thisMoment.valueOf() }
        );
      }

      await trelloSunbowl.addTask(taskListId, task);
      slackSunbowl.postToSlack(
        { text: `Great! Your task *${task}* was added.` },
        response_url
      );
    } catch (error) {
      slackSunbowl.postToSlack(
        utils.constructErrorForSlack(error),
        response_url
      );
    }
  });
};
