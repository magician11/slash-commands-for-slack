'use strict';

module.exports = (app) => {
  const formstackSunbowl = require('../modules/formstack');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const utils = require('../utils');
  const BUCKET_SECURITY_TOKEN = process.env.SUNBOWL_BUCKET_SECURITY_TOKEN;

  // get information about a bucket with Sunbowl
  app.get('/bucket', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== BUCKET_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    // switch on bucket option
    if (req.query.text === 'refill') {
      formstackSunbowl.getRefillOption(req.query.channel_name)
      .then((refillOption) => {
        const refillAmountPlans = {
          0: [14, 21, 28], // standard
          1: [40, 120, 210] // plus
        };

        const refillOptions = [];
        for (const refillBucketSize of refillAmountPlans[refillOption]) {
          refillOptions.push({ title: `${refillBucketSize} hour bucket`, title_link: `http://www.sunbowl.ca/${refillBucketSize}hb` });
        }

        res.json({
          text: 'To refill your bucket, click on your bucket choice below...',
          attachments: refillOptions
        });
      })
      .catch((err) => {
        utils.respondWithError(`Error: ${err}`, res);
      });
    } else {
      const freshbooksData = {};

      formstackSunbowl.getFreshbooksProjectId(req.query.channel_name)
      .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return freshbooksSunbowl.getProjectBudget(freshbooksProjectId); })
      .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return freshbooksSunbowl.getBillableHours(freshbooksData.projectId);})
      .then((billableHours) => {
        const percentBucketUsed = (billableHours / freshbooksData.projectBudget) * 100;
        const timeLeft = freshbooksData.projectBudget - billableHours;
        const progressColour = (percentBucketUsed > 75) ? 'danger' : 'good';

        // return the JSON for this request
        res.json({
          response_type: (req.query.text === 'public') ? 'in_channel' : 'ephemeral',
          text: `You have used \`${percentBucketUsed.toFixed()}%\` of your \`${freshbooksData.projectBudget} hour\` bucket.`,
          attachments: [
            {
              color: progressColour,
              text: `\`${timeLeft.toFixed(1)} hours\` left before you will need to top it up.`,
              mrkdwn_in: ['text']
            }
          ]
        });
      })
      .catch((err) => {
        utils.respondWithError(`Error: ${err}`, res);
      });
    }
  });
};
