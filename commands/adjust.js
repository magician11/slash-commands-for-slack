// adjust a bucket balance

const utils = require('../modules/utils');
const freshbooksSunbowl = require('../modules/freshbooks');
const formstackSunbowl = require('../modules/formstack');
const slackSunbowl = require('../modules/slack');
const firebaseSunbowl = require('../modules/firebase');
const config = require('../security/auth.js').get(process.env.NODE_ENV);

module.exports = app => {
  app.post('/adjust', async (req, res) => {
    const {
      token,
      user_name,
      user_id,
      text,
      channel_name,
      channel_id,
      response_url
    } = req.body;

    const adjustArguments = text.split(' ');

    // check to see whether this script is being accessed from our slack apps
    if (token !== config.slack.verificationToken) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (adjustArguments.length < 3) {
      utils.respondWithError(
        'Usage for the *adjust* command is `/adjust [amount] [person to review] [reason]`.',
        res
      );
      return;
    }
    const adjustmentAmount = parseInt(adjustArguments[0], 10);
    const personToReview = adjustArguments[1];
    const reason = adjustArguments.slice(2).join(' ');

    const dataToSave = {
      adjustmentAmount,
      channelId: channel_id,
      personToReview,
      reason,
      personRequestingAdjustment: user_id
    };

    try {
      const personToReviewProfile = await slackSunbowl.getUser(
        personToReview.substring(1)
      );

      res.json({
        text: `Sure thing ${user_name}. I'll send a message to ${
          personToReviewProfile.real_name
        } now asking them to approve your request.`
      });

      slackSunbowl.sendDM(
        personToReviewProfile.id,
        `Hi ${personToReviewProfile.real_name}. <@${
          user_id
        }> wants to adjust the bucket balance for ${
          channel_name
        } by an adjustment of \`${
          adjustmentAmount
        }\`. The reason for the change is "${reason}".`,
        {
          text: 'They need your approval. Do you agree?',
          callback_id: 'adjust_bucket_balance',
          actions: [
            {
              name: channel_id,
              text: 'Yes I approve',
              type: 'button',
              value: 'approved'
            },
            {
              name: channel_id,
              text: 'No, I disagree',
              type: 'button',
              value: 'denied'
            }
          ]
        }
      );
    } catch (error) {
      slackSunbowl.postToSlack(
        utils.constructErrorForSlack(error),
        response_url
      );
    }
  });
};
