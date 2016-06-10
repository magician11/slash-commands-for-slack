module.exports = (app) => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const GO_SECURITY_TOKEN = process.env.SUNBOWL_GO_SECURITY_TOKEN;

  // assign the card for this channel to a dev and then move it to the 'pending to be assigned' list
  app.get('/go', (req, res) => {
    const users = req.query.text;

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== GO_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (users === '') {
      utils.respondWithError('No person was assigned this sprint. Usage: /go [person\'s name] [optional cc]', res);
      return;
    }

    res.json({
      text: 'We\'re processing your request. One moment please...'
    });

    // the dev to assign the task to
    const assignee = users.split(' ')[0];
    // the other users to cc in on
    const ccNotifications = users.split(' ').slice(1).join(' ');

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
    .then((firstName) => {assigneeFirstName = firstName; return freshbooksSunbowl.addTimeEntry(req.query.user_name, channelName, 0.25, 'Made video for developer, captured changes to trello, sprint initiation, assigned out.');})
    .then(() => {
      const timeLeft = freshbooksData.projectBudget - freshbooksData.billableHours;
      const dueDate = utils.formatDate(utils.dateXdaysFromNow(3));

      const goReviewMessage = {
        response_type: 'in_channel',
        text: `*Your sprint has been assigned to ${assigneeFirstName}.*
${(ccNotifications.length > 0) ? `*cc: ${ccNotifications}*` : ''}
If we have missed anything please let's us know by sending us a message in the <https://sunbowl.slack.com/messages/${channelName}|#${channelName}> channel.
Expected date of completion is ${dueDate}.

*Sprint details*${utils.createBulletListFromArray(tasks)}

Bucket balance: \`${timeLeft.toFixed(1)} hours\``
      };

      slackSunbowl.postToSlack(goReviewMessage, req.query.response_url);
    })
    .catch((error) => {
      const errorMessage = {
        text: 'Whoops.. there was an issue in actioning your task list.',
        attachments: [
          {
            color: 'danger',
            text: error.toString(),
            mrkdwn_in: ['text']
          }
        ]
      };

      slackSunbowl.postToSlack(errorMessage, req.query.response_url);
    });
  });
};
