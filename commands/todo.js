/*
Slash command for Sunbowl
Add a task to their trello card
*/

module.exports = app => {
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const utils = require('../modules/utils');
  const TODO_SECURITY_TOKEN = process.env.SUNBOWL_TODO_SECURITY_TOKEN;
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/todo', (req, res) => {
    const { text, token, channel_name } = req.body;
    const task = text;

    // check to see whether this script is being accessed from our slack app
    if (
      token !== TODO_SECURITY_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (text === '') {
      utils.respondWithError(
        'No task was specified. Usage: /todo [the task you want to add]',
        res
      );
      return;
    }

    formstackSunbowl
      .getTrelloCardId(channel_name)
      .then(trelloSunbowl.getTaskListId)
      .then(taskListId => trelloSunbowl.addTask(taskListId, task))
      .then(() => {
        res.json({
          text: `Great! Your task *${task}* was added.`
        });
      })
      .catch(error => {
        utils.respondWithError(error, res);
      });
  });
};
