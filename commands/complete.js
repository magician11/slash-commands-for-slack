/*
Slash command for Sunbowl
Notify someone that a cycle for a channel is complete
*/
module.exports = app => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const slackSunbowl = require('../modules/slack');
  const trelloSunbowl = require('../modules/trello');
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post('/complete', (req, res) => {
    const { token, channel_name, user_name, response_url, text } = req.body;
    const completeArguments = text.split(' ');

    // check to see whether this script is being accessed from our slack apps
    if (
      token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (completeArguments.length < 3) {
      utils.respondWithError(
        'Usage: /complete [recipient] [time used/time budgeted] [video url]',
        res
      );
      return;
    }

    res.json({
      text: "We're processing your request. One moment please..."
    });

    const recipient = completeArguments[0];
    const bucketTimes = completeArguments[1].split('/');
    const bucketTimeUsed = bucketTimes[0];
    const bucketTimeQuoted = bucketTimes[1];
    let videoUrl;
    let description;

    if (completeArguments[2].startsWith('http')) {
      videoUrl = completeArguments[2];
      description = completeArguments.slice(3).join(' ');
    } else {
      description = completeArguments.slice(2).join(' ');
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
        return freshbooksSunbowl.getBillableHours(freshbooksData.projectId);
      })
      .then(billableHours => {
        freshbooksData.billableHours = billableHours;
        return freshbooksSunbowl.addTimeEntry(
          user_name,
          channel_name,
          0.25,
          'Reviewed developer work, made update video, sprint update post.'
        );
      })
      .then(() => {
        const timeLeft =
          freshbooksData.projectBudget - freshbooksData.billableHours;

        const completeMessage = {
          response_type: 'in_channel',
          text: `${recipient} *Your Cycle is Complete!*
${description}
${videoUrl ? `*Cycle Review*: <${videoUrl}|:arrow_forward: Watch Video>` : ''}
*Bucket Time Quoted*: \`${bucketTimeQuoted} hrs\`
*Bucket Time Used*: \`${bucketTimeUsed} hrs\`

*Remaining Bucket Balance*: \`${timeLeft.toFixed(1)} hrs\``
        };

        slackSunbowl.postToSlack(completeMessage, response_url);
      })
      .then(() => formstackSunbowl.getTrelloCardId(channel_name))
      .then(trelloCardId =>
        trelloSunbowl.moveTrelloCard(trelloCardId, '54d100b15e38c58f717dd930')
      ) // move to Archive list
      .catch(err => {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack(err),
          response_url
        );
      });
  });
};
