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
    const adjustmentAmount = adjustArguments[0];
    const personToReview = adjustArguments[1];
    const reason = adjustArguments.slice(2).join(' ');

    res.json({
      text: `Sure thing ${user_name}. I'll send a message to ${
        personToReview
      } now asking them to approve your request.`
    });

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

      slackSunbowl.sendDM(
        personToReviewProfile.id,
        `Hi ${
          personToReviewProfile.real_name
        }. A bucket balance adjustment for ${channel_name} has been requested.`,
        {
          text: 'It needs your approval.',
          callback_id: 'adjust_bucket_balance',
          fields: [
            {
              title: 'Adjustment amount requested',
              value: `${adjustmentAmount} hours`,
              short: true
            },
            {
              title: 'Approval requested by',
              value: `<@${user_id}>`,
              short: true
            },
            {
              title: 'Reason',
              value: reason,
              short: false
            }
          ],
          actions: [
            {
              name: channel_name,
              text: 'Yes I approve',
              type: 'button',
              value: 'approved'
            },
            {
              name: channel_name,
              text: 'No, I do not approve',
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
