// adjust a bucket balance

const utils = require('../modules/utils');
const freshbooksSunbowl = require('../modules/freshbooks');
const formstackSunbowl = require('../modules/formstack');
const slackSunbowl = require('../modules/slack');
// const firebaseSunbowl = require('../modules/firebase');
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
    } else if (adjustArguments.length < 2) {
      utils.respondWithError(
        'Usage for the *adjust* command is `/adjust [amount] [reason]`.',
        res
      );
      return;
    }
    const adjustmentAmount = parseInt(adjustArguments[0], 10);
    const reason = adjustArguments.slice(1).join(' ');
    res.json({ text: 'Ok.. bucket balance adjustment.. one sec...' });
    try {
      const projectId = await formstackSunbowl.getFreshbooksProjectId(
        channel_name
      );

      // adjust the bucket balance
      const freshbooksResponse = await freshbooksSunbowl.adjustProjectBudget(
        projectId,
        adjustmentAmount
      );
      const newBucketBalance = await freshbooksSunbowl.getProjectBudget(
        projectId
      );

      // let the person executing it know it was updated
      slackSunbowl.postToSlack(
        {
          text: `All done ${user_name}. The bucket balance for \`${
            channel_name
          }\` has been updated to \`${newBucketBalance}\` hours.`
        },
        response_url
      );

      // let Jody know this was done
      const userToNotify = await slackSunbowl.getUser('magician11');
      slackSunbowl.sendDM(
        userToNotify.id,
        `Hi Jody. <@${user_id}> has adjusted the bucket balance for ${
          channel_name
        } by an adjustment of \`${
          adjustmentAmount
        }\` to give a new balance of \`${
          newBucketBalance
        }\` hours. The reason for the change was "${reason}".`
      );
    } catch (error) {
      slackSunbowl.postToSlack(
        utils.constructErrorForSlack(error),
        response_url
      );
    }
  });
};
