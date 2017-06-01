/*
Slash command for Sunbowl
Get the description info for this channel's trello card.
*/

module.exports = app => {
  const utils = require('../modules/utils');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const DEETS_SECURITY_TOKEN = process.env.SUNBOWL_DEETS_SECURITY_TOKEN;
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/deets', (req, res) => {
    const { token, user_name, channel_name, response_url } = req.body;

    // check to see whether this script is being accessed from our slack app
    if (
      token !== DEETS_SECURITY_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
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
          text: `${descriptionData}`,
          attachments: [
            {
              title: `Direct link to Trello card for ${channel_name}`,
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
