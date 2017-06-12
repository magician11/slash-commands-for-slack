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

  app.post('/action', (req, res) => {
    const slackMessage = JSON.parse(req.body.payload);

    // check to see whether this script is being accessed from our slack apps
    if (
      slackMessage.token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      slackMessage.token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    switch (slackMessage.callback_id) {
      case 'review_tasks': {
        const actionCycle = slackMessage.actions[0].value === 'confirm';
        res.json({
          text: slackMessage.original_message.text,
          attachments: [
            slackMessage.original_message.attachments[0],
            slackMessage.original_message.attachments[1],
            {
              text: actionCycle
                ? 'Ok, great. We will action this cycle now for you.'
                : 'Ok, no prob. Let us know what you want changed.',
              color: actionCycle ? 'good' : 'warning'
            }
          ]
        });

        if (actionCycle) {
          // console.log(
          //   slackMessage.original_message.attachments[1].fields[0].value,
          //   slackMessage.original_message.attachments[1].fields[1].value,
          //   slackMessage.user.name,
          //   slackMessage.channel.name,
          //   slackMessage.response_url
          // );
          console.log(JSON.stringify(slackMessage.original_message, null, 2));
          assignCycle(
            slackMessage.original_message.attachments[1].fields[0].value,
            slackMessage.original_message.attachments[1].fields[1].value,
            slackMessage.user.name,
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

    // console.log(JSON.stringify(slackMessage, null, 2));
  });
};
