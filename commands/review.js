/*
Slash command for Sunbowl
Get all the tasks from this channel's trello card
*/

module.exports = app => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const REVIEW_SECURITY_TOKEN = process.env.SUNBOWL_REVIEW_SECURITY_TOKEN;
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/review', (req, res) => {
    const { text, token, channel_name, user_name, response_url } = req.body;

    // check to see whether this script is being accessed from our slack app
    if (
      token !== REVIEW_SECURITY_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    res.json({
      text: `Assembling the review now for you ${user_name}. One moment please...`
    });

    const reviewArguments = text.split(' ');

    formstackSunbowl
      .getTrelloCardId(channel_name)
      .then(trelloSunbowl.getTaskListId)
      .then(trelloSunbowl.getTaskListItems)
      .then(taskList => {
        if (taskList.length === 0) {
          slackSunbowl.postToSlack(
            utils.constructErrorForSlack('No tasks were found.'),
            response_url
          );
        } else {
          let taskMessage = `Tasks awaiting your approval...${utils.createBulletListFromArray(taskList)}`;
          if (reviewArguments[0] !== '') {
            taskMessage += `\n*Hey ${reviewArguments[0]}, please review the above cycle and let me know if it's ready to assign out.*`;
          }
          const freshbooksData = {};

          formstackSunbowl
            .getFreshbooksProjectId(channel_name)
            .then(freshbooksProjectId => {
              freshbooksData.projectId = freshbooksProjectId;
              return freshbooksSunbowl.getProjectBudget(freshbooksProjectId);
            })
            .then(projectBudget => {
              freshbooksData.projectBudget = projectBudget;
              return freshbooksSunbowl.getBillableHours(
                freshbooksData.projectId
              );
            })
            .then(billableHours => {
              const percentBucketUsed =
                billableHours / freshbooksData.projectBudget * 100;
              const timeLeft = freshbooksData.projectBudget - billableHours;

              taskMessage += `\n\`You have used ${percentBucketUsed.toFixed(0)}% of your bucket (${timeLeft.toFixed(1)} hours left)\``;

              const reviewResponse = {
                response_type: reviewArguments[0] === ''
                  ? 'ephemeral'
                  : 'in_channel',
                text: `${taskMessage}`
              };
              slackSunbowl.postToSlack(reviewResponse, response_url);
            });
        }
      })
      .then(() => formstackSunbowl.getTrelloCardId(channel_name))
      .then(trelloCardId =>
        trelloSunbowl.moveTrelloCard(trelloCardId, '537bc2cec1db170a09078963')
      ) // move to Pending to be assigned list
      .catch(error => {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack(error),
          response_url
        );
      });
  });
};
