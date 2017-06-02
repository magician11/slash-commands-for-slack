/*
Slash command for Sunbowl
Get all the tasks from this channel's trello card, and present them optionally to
a user. If presented to a user, add buttons for them to confirm this cycle.
*/

module.exports = app => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/review', async (req, res) => {
    const { text, token, channel_name, user_name, response_url } = req.body;
    const reviewArguments = text.split(' ');

    // check to see whether this script is being accessed from our slack app
    if (token !== SUNBOWL_AI_VERIFICATION_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (reviewArguments.length !== 0 || reviewArguments.length < 3) {
      utils.respondWithError(
        'Usage: /review [time taken to assign] [dev name] [client name] [optional cc]',
        res
      );
      return;
    }

    res.json({
      text: `Assembling the review now for you ${user_name}. One moment please...`
    });

    try {
      const trelloCardId = await formstackSunbowl.getTrelloCardId(channel_name);
      const taskListId = await trelloSunbowl.getTaskListId(trelloCardId);
      const taskList = await trelloSunbowl.getTaskListItems(taskListId);

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

        const freshbooksProjectId = await formstackSunbowl.getFreshbooksProjectId(
          channel_name
        );
        const projectBudget = await freshbooksSunbowl.getProjectBudget(
          freshbooksProjectId
        );
        const billableHours = await freshbooksSunbowl.getBillableHours(
          freshbooksProjectId
        );

        const percentBucketUsed = billableHours / projectBudget * 100;
        const timeLeft = projectBudget - billableHours;

        taskMessage += `\n\`You have used ${percentBucketUsed.toFixed(0)}% of your bucket (${timeLeft.toFixed(1)} hours left)\``;

        const reviewResponse = {
          response_type: reviewArguments[0] === '' ? 'ephemeral' : 'in_channel',
          text: `${taskMessage}`
        };
        slackSunbowl.postToSlack(reviewResponse, response_url);

        // and finally move the card to the pending to be assigned list
        trelloSunbowl.moveTrelloCard(trelloCardId, '537bc2cec1db170a09078963');
      }
    } catch (error) {
      slackSunbowl.postToSlack(
        utils.constructErrorForSlack(error),
        response_url
      );
    }
  });
};
