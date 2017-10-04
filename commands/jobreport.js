/*
Slash command for Sunbowl
Notify someone that a sprint for a channel is complete
*/

const utils = require("../modules/utils");
const trelloSunbowl = require("../modules/trello");
const freshbooksSunbowl = require("../modules/freshbooks");
const formstackSunbowl = require("../modules/formstack");
const slackSunbowl = require("../modules/slack");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

module.exports = app => {
  app.post("/jobreport", (req, res) => {
    const {
      token,
      user_name,
      text,
      channel_name,
      channel_id,
      response_url
    } = req.body;

    const jobreportArguments = text.split(" ");

    // check to see whether this script is being accessed from our slack apps
    if (token !== config.slack.verificationToken) {
      utils.respondWithError("Access denied.", res);
      return;
    } else if (jobreportArguments.length !== 2) {
      utils.respondWithError("Usage: /jobreport [time taken] [video url]", res);
      return;
    }

    res.json({
      text: `Thanks <@${user_name}>. Your job report has been submitted.`
    });

    const finishedBlockListId = "522e91fe2c1df8cb25008ab2";

    const timeTaken = jobreportArguments[0];
    const videoUrl = jobreportArguments[1];

    freshbooksSunbowl
      .addTimeEntry(user_name, channel_name, parseFloat(timeTaken), videoUrl)
      .then(() => formstackSunbowl.getTrelloCardId(channel_name))
      .then(trelloCardId =>
        trelloSunbowl.moveTrelloCard(trelloCardId, finishedBlockListId)
      )
      .then(trelloCardId => {
        slackSunbowl.postJobReport({
          text: `Hey <@nic> & <@jody>,
<@${user_name}> just finished a sprint for <#${channel_id}>
Time it took: \`${timeTaken} hrs\`
Video review: ${videoUrl}
Trello card: https://trello.com/c/${trelloCardId}`
        });
        slackSunbowl.postToSlack(
          {
            text:
              "A job report has been submitted and your project is now in the review stage. We will update you as soon as possible when we are ready for your feedback.",
            response_type: "in_channel"
          },
          response_url
        );
      })
      .catch(err => {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack(err),
          response_url
        );
      });
  });
};
