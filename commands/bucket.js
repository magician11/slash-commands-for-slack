const formstackSunbowl = require("../modules/formstack");
const freshbooksSunbowl = require("../modules/freshbooks");
const slackSunbowl = require("../modules/slack");
const utils = require("../modules/utils");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

module.exports = app => {
  // get information about a bucket with Sunbowl
  app.post("/bucket", (req, res) => {
    const { text, channel_name, token, response_url } = req.body;

    // check to see whether this script is being accessed from our slack apps
    if (token !== config.slack.verificationToken) {
      utils.respondWithError("Access denied.", res);
      return;
    }

    res.json({
      text: "Ok, calculating that balance for you now..."
    });

    const bucketParameters = text.split(" ");

    // switch on bucket option
    if (bucketParameters[0] === "refill") {
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

          slackSunbowl.postToSlack(
            {
              response_type:
                bucketParameters[bucketParameters.length - 1] === "public"
                  ? "in_channel"
                  : "ephemeral",
              text:
                "To refill your bucket, click on your bucket choice below...",
              attachments: refillOptions
            },
            response_url
          );
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
            progressColour = "good";
            bucketImage =
              "https://cdn.shopify.com/s/files/1/0359/6033/files/full-bucket1-110.jpg";
          } else {
            progressColour = "danger";
            bucketImage =
              "https://cdn.shopify.com/s/files/1/0359/6033/files/low-bucket1-110.jpg";
          }

          // return the JSON for this request
          slackSunbowl.postToSlack(
            {
              response_type:
                bucketParameters[bucketParameters.length - 1] === "public"
                  ? "in_channel"
                  : "ephemeral",
              text: `You have used \`${percentBucketUsed.toFixed()}%\` of your \`${freshbooksData.projectBudget} hour\` bucket.`,
              attachments: [
                {
                  title: "Bucket Status",
                  color: progressColour,
                  text: `\`${timeLeft.toFixed(
                    1
                  )} hours\` left before you will need to top it up.`,
                  image_url: bucketImage,
                  mrkdwn_in: ["text"]
                }
              ]
            },
            response_url
          );
        })
        .catch(err => {
          utils.respondWithError(`Error: ${err}`, res);
        });
    }
  });
};
