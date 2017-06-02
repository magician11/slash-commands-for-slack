/*
 Slash command to:
 Bill Sunbowl for a particular channel with an hour amount, task type and description/URL.
*/

module.exports = app => {
  const freshbooksSunbowl = require('../modules/freshbooks');
  const slackSunbowl = require('../modules/slack');
  const utils = require('../modules/utils');
  const BILL_SECURITY_TOKEN = process.env.SUNBOWL_BILL_SECURITY_TOKEN;
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/bill', (req, res) => {
    const { token, channel_name, user_name, text, response_url } = req.body;
    const billParameters = text.split(' ');

    // check to see whether this script is being accessed from our slack app
    if (
      token !== BILL_SECURITY_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (billParameters.length < 3) {
      utils.respondWithError(
        'Usage: /bill [hours] [task type] [description/video url]',
        res
      );
      return;
    }

    // const channelName = req.query.channel_name;
    const timeToBeBilled = billParameters[0];
    const taskType = billParameters[1];
    const jobDetails = billParameters[2];

    // the task type has to be one of these...
    const taskOptions = ['admin', 'coding', 'research'];
    if (!taskOptions.includes(taskType)) {
      utils.respondWithError(
        `For the task option, it needs to be one of: ${taskOptions.join(', ')}`,
        res
      );
      return;
    }

    res.json({
      text: 'We are counting our chickens... standby'
    });

    // if it starts with http it's a url, otherwise join all the words for the description
    (jobDetails.startsWith('http')
      ? utils.shortenUrl(jobDetails)
      : Promise.resolve(billParameters.slice(2).join(' ')))
      .then(jobNotes =>
        freshbooksSunbowl.addTimeEntry(
          user_name,
          channel_name,
          timeToBeBilled,
          jobNotes
        )
      )
      .then(timeEntry => {
        // uppercase first letter of task
        const billMessage = {
          text: `${taskType
            .charAt(0)
            .toUpperCase()}${taskType.slice(1)} Time Logged.`,
          response_type: 'in_channel',
          attachments: [
            {
              title: channel_name,
              color: 'good',
              text: `\`${timeEntry.hours} hours\` logged for \`${timeEntry.notes}\``,
              mrkdwn_in: ['text']
            }
          ]
        };

        slackSunbowl.postToSlack(billMessage, response_url);
      })
      .catch(err => {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack(err),
          response_url
        );
      });
  });
};
