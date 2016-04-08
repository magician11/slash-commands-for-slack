'use strict';

module.exports = (app) => {
  const apiCalls = require('../api-calls');
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
    if (req.query.text) {
      switch (req.query.text) {
        case 'refill':

        res.json({
          text: 'To refill your bucket, click on your bucket choice below...',
          attachments: [
            {
              title: '14 hour bucket',
              title_link: 'http://www.sunbowl.ca/14hb'
            },
            {
              title: '21 hour bucket',
              title_link: 'http://www.sunbowl.ca/21hb'
            },
            {
              title: '28 hour bucket',
              title_link: 'http://www.sunbowl.ca/28hb'
            },
            {
              title: '40 hour bucket',
              title_link: 'http://www.sunbowl.ca/40hb'
            }
          ]
        });
        break;

        default: utils.respondWithError(`*${req.query.text}* is not a recognised option for the bucket command.`, res);

      }
    } else {
      const freshbooksData = {};

      apiCalls.getFreshbooksProjectId(req.query.channel_name)
      .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return apiCalls.getProjectBudget(freshbooksProjectId); })
      .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return apiCalls.getBillableHours(freshbooksData.projectId);})
      .then((billableHours) => {
        const percentBucketUsed = (billableHours / freshbooksData.projectBudget) * 100;
        const timeLeft = freshbooksData.projectBudget - billableHours;
        const progressColour = (percentBucketUsed > 75) ? 'danger' : 'good';

        // return the JSON for this request
        res.json({
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
