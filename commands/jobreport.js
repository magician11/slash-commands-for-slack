module.exports = (app) => {
  const utils = require('../modules/utils');
  const trelloSunbowl = require('../modules/trello');
  const formstackSunbowl = require('../modules/formstack');
  const slackSunbowl = require('../modules/slack');
  const JOBREPORT_SECURITY_TOKEN = process.env.SUNBOWL_JOBREPORT_SECURITY_TOKEN;

  // notify someone that a sprint for a channel is complete
  app.get('/jobreport', (req, res) => {
    const userName = req.query.user_name;
    const jobreportArguments = req.query.text.split(' ');

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== JOBREPORT_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (jobreportArguments.length !== 2) {
      utils.respondWithError('Usage: /jobreport [time taken] [video url]', res);
      return;
    }

    res.json({ text: `Thanks <@${userName}>. Your job report has been submitted.` });

    const finishedBlockListId = '522e91fe2c1df8cb25008ab2';

    formstackSunbowl.getTrelloCardId(req.query.channel_name)
    .then((trelloCardId) => trelloSunbowl.moveTrelloCard(trelloCardId, finishedBlockListId))
    .then((trelloCardId) => {
      slackSunbowl.postJobReport({
        text: `Hey <@nic> & <@jody>,
<@${userName}> just finished a sprint for <#${req.query.channel_id}>
Time it took: \`${jobreportArguments[0]} hrs\`
Video review: ${jobreportArguments[1]}
Trello card: https://trello.com/c/${trelloCardId}`
      });
    })
    .catch((err) => {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(err), req.query.response_url);
    });
  });
};
