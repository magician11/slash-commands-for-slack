'use strict';

module.exports = (app) => {
  const utils = require('../utils');
  const apiCalls = require('../api-calls');
  const GO_SECURITY_TOKEN = process.env.SUNBOWL_GO_SECURITY_TOKEN;

  // assign the card for this channel to a dev and then move it to the 'pending to be assigned' list
  app.get('/go', (req, res) => {
    const users = req.query.text;

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== GO_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (users === '') {
      utils.respondWithError('No person was assigned this sprint. Usage: /go [person\'s name]', res);
      return;
    }

    // the dev to assign the task to
    const assignee = users.split(' ')[0];
    // the other users to cc in on
    const ccNotifications = users.split(' ').slice(1).join(' ');

    const channelName = req.query.channel_name;
    const freshbooksData = {};
    let tasks = [];

    apiCalls.getTrelloCardId(channelName)
    .then(apiCalls.moveTrelloCard)
    .then(apiCalls.getTaskListId)
    .then((taskListId) => { return apiCalls.renameTasklist(taskListId, assignee); })
    .then((taskListId) => { return apiCalls.getTaskListItems(taskListId); })
    .then((taskList) => { tasks = taskList; return apiCalls.getFreshbooksProjectId(channelName); })
    .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return apiCalls.getProjectBudget(freshbooksProjectId); })
    .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return apiCalls.getBillableHours(freshbooksData.projectId);})
    .then((billableHours) => {
      const timeLeft = freshbooksData.projectBudget - billableHours;
      const dueDate = utils.dateXdaysFromNow(3);

      res.json({
        response_type: 'in_channel',
text: `*Your latest sprint has been assigned to ${assignee}*
${(ccNotifications.length > 0) ? `*cc: ${ccNotifications}*` : ''}
If we have missed anything please let's us know by sending us a message in the #${channelName} channel.
Expected date of completion is ${dueDate}.

*Sprint details*${utils.createBulletListFromArray(tasks)}
Bucket balance: ${timeLeft.toFixed(1)} hours`
      });
    })
    .catch((error) => {
      utils.respondWithError(error, res);
    });
  });
};
