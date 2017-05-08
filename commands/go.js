module.exports = (app) => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const GO_SECURITY_TOKEN = process.env.SUNBOWL_GO_SECURITY_TOKEN;

  /* eslint-disable max-len */

  // assign the card for this channel to a dev and then move it to the 'pending to be assigned' list
  app.get('/go', (req, res) => {
    const parameters = req.query.text;

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== GO_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    const usage = 'Usage: /go [time taken to assign] [person\'s name] [optional cc]';

    if (parameters === '') {
      utils.respondWithError(`No parameters entered. ${usage}`, res);
      return;
    }

    const individualParams = parameters.split(' ');

    if (individualParams.length <= 1) {
      utils.respondWithError(`Something is missing. ${usage}`, res);
      return;
    }

    res.json({
      text: 'We\'re processing your request. One moment please...'
    });

    const timeTakenToAssign = individualParams[0];
    // the dev to assign the task to
    const assignee = individualParams[1];
    // the other users to cc in on
    const ccNotifications = individualParams.slice(2).join(' ');

    const channelName = req.query.channel_name;
    const freshbooksData = {};
    const trelloData = {};
    let tasks = [];
    let assigneeFirstName = '';

    formstackSunbowl.getTrelloCardId(channelName)
    .then((trelloCardId) => { trelloData.id = trelloCardId; return trelloSunbowl.findListId(assignee); })
    .then((trelloListId) => trelloSunbowl.moveTrelloCard(trelloData.id, trelloListId))
    .then(trelloSunbowl.setDueDate)
    .then(trelloSunbowl.getTaskListId)
    .then(trelloSunbowl.moveTaskListToTop)
    .then((taskListId) => trelloSunbowl.renameTasklist(taskListId, assignee))
    .then((taskListId) => trelloSunbowl.getTaskListItems(taskListId))
    .then((taskList) => { tasks = taskList; return formstackSunbowl.getFreshbooksProjectId(channelName); })
    .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return freshbooksSunbowl.getProjectBudget(freshbooksProjectId); })
    .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return freshbooksSunbowl.getBillableHours(freshbooksData.projectId);})
    .then((billableHours) => {freshbooksData.billableHours = billableHours; return slackSunbowl.getFirstname(assignee.slice(1));})
    .then((firstName) => {assigneeFirstName = firstName; return freshbooksSunbowl.addTimeEntry(req.query.user_name, channelName, parseFloat(timeTakenToAssign), 'Discussions with client about cycle details. Made video for developer, organized cycle and assigned out.');})
    .then(() => {
      const timeLeft = freshbooksData.projectBudget - freshbooksData.billableHours;

      const goReviewMessage = {
        response_type: 'in_channel',
        text: `*${assigneeFirstName} has been assigned your next cycle.*
${(ccNotifications.length > 0) ? `*cc: ${ccNotifications}*` : ''}
If we have missed anything please let's us know by sending us a message in the <https://sunbowl.slack.com/messages/${channelName}|#${channelName}> channel.
Your cycle has been placed in the queue and will be worked on as soon as possible.

*Cycle details*${utils.createBulletListFromArray(tasks)}
This cycle took \`${timeTakenToAssign} hours\` to assign out.
Bucket balance: \`${timeLeft.toFixed(1)} hours\``
      };

      slackSunbowl.postToSlack(goReviewMessage, req.query.response_url);
    })
    .catch((error) => {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(error), req.query.response_url);
    });
  });
};
