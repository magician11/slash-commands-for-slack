module.exports = app => {
  const formstackSunbowl = require('../modules/formstack');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const utils = require('../modules/utils');
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  // get information about a bucket with Sunbowl
  app.post('/bucket', (req, res) => {
    const { text, channel_name, token } = req.body;

    // check to see whether this script is being accessed from our slack apps
    if (
      token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    // switch on bucket option
    if (text === 'refill') {
      formstackSunbowl
        .getRefillOption(channel_name)
        .then(refillOption => {
          const refillAmountPlans = {
            0: [14, 21, 28], // standard
            1: [40, 120, 210] // plus
          };

          const refillOptions = [];
          for (const refillBucketSize of refillAmountPlans[refillOption]) {
            refillOptions.push({
              title: `${refillBucketSize} hour bucket`,
              title_link: `http://www.sunbowl.ca/${refillBucketSize}hb`
            });
          }

          res.json({
            text: 'To refill your bucket, click on your bucket choice below...',
            attachments: refillOptions
          });
        })
        .catch(err => {
          utils.respondWithError(`Error: ${err}`, res);
        });
    } else {
      const freshbooksData = {};

      formstackSunbowl
        .getFreshbooksProjectId(channel_name)
        .then(freshbooksProjectId => {
          freshbooksData.projectId = freshbooksProjectId;
          return freshbooksSunbowl.getProjectBudget(freshbooksProjectId);
        })
        .then(projectBudget => {
          freshbooksData.projectBudget = projectBudget;
          return freshbooksSunbowl.getBillableHours(freshbooksData.projectId);
        })
        .then(billableHours => {
          const percentBucketUsed =
            billableHours / freshbooksData.projectBudget * 100;
          const timeLeft = freshbooksData.projectBudget - billableHours;

          let progressColour;
          let bucketImage;
          if (percentBucketUsed < 75) {
            progressColour = 'good';
            bucketImage =
              'https://cdn.shopify.com/s/files/1/0359/6033/files/full-bucket1-110.jpg';
          } else {
            progressColour = 'danger';
            bucketImage =
              'https://cdn.shopify.com/s/files/1/0359/6033/files/low-bucket1-110.jpg';
          }

          // return the JSON for this request
          res.json({
            response_type: text === 'public' ? 'in_channel' : 'ephemeral',
            text: `You have used \`${percentBucketUsed.toFixed()}%\` of your \`${freshbooksData.projectBudget} hour\` bucket.`,
            attachments: [
              {
                title: 'Bucket Status',
                color: progressColour,
                text: `\`${timeLeft.toFixed(1)} hours\` left before you will need to top it up.`,
                image_url: bucketImage,
                mrkdwn_in: ['text']
              }
            ]
          });
        })
        .catch(err => {
          utils.respondWithError(`Error: ${err}`, res);
        });
    }
  });
};
