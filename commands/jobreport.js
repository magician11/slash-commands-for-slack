'use strict';

module.exports = (app) => {
  const utils = require('../utils');
  const apiCalls = require('../api-calls');
  const JOBREPORT_SECURITY_TOKEN = process.env.SUNBOWL_JOBREPORT_SECURITY_TOKEN;

  // notify someone that a sprint for a channel is complete
  app.get('/jobreport', (req, res) => {
    const jobreportArguments = req.query.text.split(' ');

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== JOBREPORT_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (jobreportArguments.length !== 2) {
      utils.respondWithError('Usage: /jobreport [time taken] [video url]', res);
      return;
    }

    const channelName = req.query.channel_name;

    apiCalls.getTrelloCardId(channelName)
    .then((trelloCardId) => {
      res.json({
        response_type: 'in_channel',
        link_names : 1,
        text: `Hey @notnic & @jody,
  @${req.query.user_name} just finished a sprint for #${channelName}
  Time it took: \`${jobreportArguments[0]} hrs\`
  Video review: ${jobreportArguments[1]}
  Trello card: https://trello.com/c/${trelloCardId}`
      });
    })
    .catch((err) => {
      utils.respondWithError(`Error: ${err}`, res);
    });
  });
};
