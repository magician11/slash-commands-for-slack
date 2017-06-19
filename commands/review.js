/*
Slash command for Sunbowl
Get all the tasks from this channel's trello card, and present them to a client to review.
Buttons are added for them to confirm this cycle.
*/

module.exports = app => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post('/review', async (req, res) => {
    const { text, token, channel_name, user_name, response_url } = req.body;
    const reviewArguments = text.split(' ');

    // check to see whether this script is being accessed from our slack apps
    if (
      token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (reviewArguments[0] !== '' && reviewArguments.length < 3) {
      utils.respondWithError(
        'Usage: /review [time taken to assign] [dev name] [client name] [optional cc]',
        res
      );
      return;
    }

    res.json({
      text: `Assembling the review now for you ${user_name}. One moment please...`
    });

    const timeTakenToAssign = reviewArguments[0];
    const devName = reviewArguments[1];
    const clientName = reviewArguments[2];
    const ccField = reviewArguments.length === 4
      ? ` (cc: <${reviewArguments[3]}>)`
      : '';

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

        const reviewResponse = {};

        if (reviewArguments[0] === '') {
          reviewResponse.text = `${utils.createBulletListFromArray(taskList)}`;
        } else {
          reviewResponse.text = `*Tasks awaiting your approval <${clientName}>${ccField}...*${utils.createBulletListFromArray(
            taskList
          )}`;
          reviewResponse.response_type = 'in_channel';
          reviewResponse.attachments = [
            {
              color: '#00bfff',
              fields: [
                {
                  title: 'Time Taken To Assign',
                  value: `${user_name}: ${timeTakenToAssign}`,
                  short: true
                },
                {
                  title: 'Cycle will be assigned to:',
                  value: devName,
                  short: true
                }
              ],
              footer: `*Your currently have ${timeLeft.toFixed(
                1
              )} hours left of your bucket balance.*`
            },
            {
              text: `*Please review the above cycle. Ready to proceed?*`,
              mrkdwn_in: ['text'],
              callback_id: 'review_tasks',
              actions: [
                {
                  name: 'review',
                  text: 'Confirm',
                  type: 'button',
                  value: 'confirm',
                  style: 'primary'
                },
                {
                  name: 'review',
                  text: 'I have some changes',
                  type: 'button',
                  value: 'cancel'
                }
              ]
            }
          ];
        }

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
