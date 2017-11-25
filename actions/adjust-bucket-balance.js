const formstackSunbowl = require('../modules/formstack');
const slackSunbowl = require('../modules/slack');
const freshbooksSunbowl = require('../modules/freshbooks');
const utils = require('../modules/utils');

module.exports = async (
  channel_name,
  adjustmentAmount,
  user_id, // person originally requesting the adjustment
  reason,
  approverId,
  response_url
) => {
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

    // let the original requester know the balance was updated
    slackSunbowl.sendDM(
      user_id,
      `Your request to adjust the bucket balance for ${
        channel_name
      } has been approved by <@${
        approverId
      }>. The new bucket balance is now \`${newBucketBalance}\` hours.`
    );

    // let Jody know this was done
    const userToNotify = await slackSunbowl.getUser('magician11');
    slackSunbowl.sendDM(
      userToNotify.id,
      `Hi Jody. <@${user_id}> has adjusted the bucket balance for ${
        channel_name
      } by \`${adjustmentAmount}\` hours to give a new balance of \`${
        newBucketBalance
      }\` hours. The reason for the change was "${
        reason
      }". This was approved by <@${approverId}>.`
    );
  } catch (error) {
    slackSunbowl.postToSlack(utils.constructErrorForSlack(error), response_url);
  }
};
