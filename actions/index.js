/*
Process incoming interactions from the slack channel, like buttons
*/
const assignCycle = require('./go');
const utils = require('../modules/utils');

module.exports = app => {
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post('/action', async (req, res) => {
    const slackMessage = JSON.parse(req.body.payload);

    // check to see whether this script is being accessed from our slack apps
    if (
      slackMessage.token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      slackMessage.token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    // console.log(JSON.stringify(slackMessage, null, 2));

    switch (slackMessage.callback_id) {
      case 'review_tasks': {
        const actionCycle = slackMessage.actions[0].value === 'confirm';
        res.json({
          text: slackMessage.original_message.text,
          attachments: [
            slackMessage.original_message.attachments[0],
            {
              text: actionCycle
                ? 'Ok, great. We will action this cycle now for you.'
                : 'Ok, no prob. Let us know what you want changed.',
              color: actionCycle ? 'good' : 'warning'
            }
          ]
        });

        if (actionCycle) {
          // split something like 'nic: 0.3'
          const assignedOutDetails = slackMessage.original_message.attachments[0].fields[0].value.split(
            ': '
          );
          assignCycle(
            assignedOutDetails[0],
            assignedOutDetails[1],
            slackMessage.original_message.attachments[0].fields[1].value,
            slackMessage.channel.name,
            slackMessage.response_url
          );
        }
        break;
      }
      default: {
        utils.respondWithError('This interaction is not known.', res);
      }
    }
  });
};
