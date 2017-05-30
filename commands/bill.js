module.exports = app => {
  // const apiCalls = require('../api-calls');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const slackSunbowl = require('../modules/slack');
  const utils = require('../modules/utils');
  const BILL_SECURITY_TOKEN = process.env.SUNBOWL_BILL_SECURITY_TOKEN;

  // bill Sunbowl for a particular channel with an hour amount and description/URL
  app.get('/bill', (req, res) => {
    const billParameters = req.query.text.split(' ');

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== BILL_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (billParameters.length < 3) {
      utils.respondWithError(
        'Usage: /bill [hours] [task type] [description/video url]',
        res
      );
      return;
    }

    const channelName = req.query.channel_name;
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
          req.query.user_name,
          channelName,
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
              title: channelName,
              color: 'good',
              text: `\`${timeEntry.hours} hours\` logged for \`${timeEntry.notes}\``,
              mrkdwn_in: ['text']
            }
          ]
        };

        slackSunbowl.postToSlack(billMessage, req.query.response_url);
      })
      .catch(err => {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack(err),
          req.query.response_url
        );
      });
  });
};
