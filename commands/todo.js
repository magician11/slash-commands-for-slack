module.exports = (app) => {
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const utils = require('../modules/utils');
  const TODO_SECURITY_TOKEN = process.env.SUNBOWL_TODO_SECURITY_TOKEN;

  // add a task to their trello card
  app.get('/todo', (req, res) => {
    const task = req.query.text;

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== TODO_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (req.query.text === '') {
      utils.respondWithError('No task was specified. Usage: /todo [the task you want to add]', res);
      return;
    }

    formstackSunbowl.getTrelloCardId(req.query.channel_name)
    .then(trelloSunbowl.getTaskListId)
    .then((taskListId) => trelloSunbowl.addTask(taskListId, task))
    .then(() => {
      res.json({
        text: `Great! Your task *${task}* was added.`
      });
    })
    .catch((error) => {
      utils.respondWithError(error, res);
    });
  });
};
