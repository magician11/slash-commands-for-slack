/*
Slash command for Sunbowl
Get the description info for this channel's trello card.
*/

const utils = require("../modules/utils");
const formstackSunbowl = require("../modules/formstack");
const trelloSunbowl = require("../modules/trello");
const slackSunbowl = require("../modules/slack");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

module.exports = app => {
  app.post("/deets", (req, res) => {
    const { token, user_name, channel_name, response_url } = req.body;

    // check to see whether this script is being accessed from our slack apps
    if (token !== config.slack.verificationToken) {
      utils.respondWithError("Access denied.", res);
      return;
    }

    res.json({
      text: `Fetching those deets for you now ${user_name}. One moment please...`
    });

    let projectsTrelloCardId;

    formstackSunbowl
      .getTrelloCardId(channel_name)
      .then(trelloCardId => {
        projectsTrelloCardId = trelloCardId;
        return trelloSunbowl.getCardDescription(projectsTrelloCardId);
      })
      .then(descriptionData => {
        const deetsResponse = {
          text: `*Project Card Details*\n\`\`\`${descriptionData}\`\`\``,
          attachments: [
            {
              title: "Project Details",
              title_link: `https://trello.com/c/${projectsTrelloCardId}`
            }
          ]
        };
        slackSunbowl.postToSlack(deetsResponse, response_url);
      })
      .catch(error => {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack(error),
          response_url
        );
      });
  });
};
