'use strict';

module.exports = (app) => {
  const utils = require('../utils');
  const apiCalls = require('../api-calls');
  const REVIEW_SECURITY_TOKEN = process.env.SUNBOWL_REVIEW_SECURITY_TOKEN;

  // get all the tasks from this channel's trello card
  app.get('/review', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== REVIEW_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    apiCalls.getTrelloCardId(req.query.channel_name)
    .then(apiCalls.getTaskListId)
    .then(apiCalls.getTaskListItems)
    .then((taskList) => {
      const taskMessage = (taskList.length === 0) ? 'You have no tasks listed.' : `Your current tasks are...${utils.createBulletListFromArray(taskList)}`;
      res.json({
        response_type: (req.query.text === 'public') ? 'in_channel' : 'ephemeral',
        text: `${taskMessage}`
      });
    })
  .catch((error) => {
    utils.respondWithError(error, res);
  });
});
};
