module.exports = (app) => {
  const utils = require('../modules/utils');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const QUE_SECURITY_TOKEN = process.env.SUNBOWL_QUE_SECURITY_TOKEN;

  // get the current workload for developers
  app.get('/que', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== QUE_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    res.json({
      text: `Hey ${req.query.user_name}, compiling the developers' workloads now...`
    });

    trelloSunbowl.getDeveloperWorkloads()
    .then((developerWorkloads) => {
      const developerSummary = {
        text: 'Current developer workload.',
        attachments: developerWorkloads.map((developer) => {
          return { text: `${developer.name}: ${developer.numberOfCards}` };
        })
      };
      slackSunbowl.postToSlack(developerSummary, req.query.response_url);
    })
    .catch((error) => {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(error), req.query.response_url);
    });
  });
};
