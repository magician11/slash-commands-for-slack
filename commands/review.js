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

    res.json({
      text: `Assembling the review now for you ${req.query.user_name}. One moment please...`
    });

    const reviewArguments = req.query.text.split(' ');

    apiCalls.getTrelloCardId(req.query.channel_name)
    .then(apiCalls.getTaskListId)
    .then(apiCalls.getTaskListItems)
    .then((taskList) => {
      if (taskList.length === 0) {
        utils.respondWithError('No tasks were found.', res);
      } else {
        let taskMessage = `Your current tasks are...${utils.createBulletListFromArray(taskList)}`;
        if (reviewArguments[0] !== '') {
          taskMessage += `\n*Hey ${reviewArguments[0]}, please review the above sprint and let me know if it's ready to assign out.*`;
        }
        const freshbooksData = {};

        apiCalls.getFreshbooksProjectId(req.query.channel_name)
        .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return apiCalls.getProjectBudget(freshbooksProjectId); })
        .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return apiCalls.getBillableHours(freshbooksData.projectId);})
        .then((billableHours) => {
          const percentBucketUsed = (billableHours / freshbooksData.projectBudget) * 100;
          const timeLeft = freshbooksData.projectBudget - billableHours;

          taskMessage += `\n\`You have used ${percentBucketUsed.toFixed(0)}% of your bucket (${timeLeft.toFixed(1)} hours left)\``;

          const reviewResponse = {
            response_type: 'in_channel',
            text: `${taskMessage}`
          };
          apiCalls.postToSlack(reviewResponse, req.query.response_url);
        });
      }
    })
    .catch((error) => {
      utils.respondWithError(error, res);
    });
  });
};
