module.exports = (app) => {
  const utils = require('../modules/utils');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const DEETS_SECURITY_TOKEN = process.env.SUNBOWL_DEETS_SECURITY_TOKEN;

  // get the description info for this channel's trello card
  app.get('/deets', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== DEETS_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    res.json({
      text: `Fetching those deets for you now ${req.query.user_name}. One moment please...`
    });

    formstackSunbowl.getTrelloCardId(req.query.channel_name)
    .then(trelloSunbowl.getCardDescription)
    .then((descriptionData) => {
      const deetsResponse = {
        text: `${descriptionData}`
      };
      slackSunbowl.postToSlack(deetsResponse, req.query.response_url);
    })
    .catch((error) => {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(error), req.query.response_url);
    });
  });
};
