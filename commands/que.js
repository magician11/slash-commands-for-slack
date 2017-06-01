/*
Slash command for Sunbowl
Get the current workload for developers
*/

module.exports = app => {
  const utils = require('../modules/utils');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');
  const QUE_SECURITY_TOKEN = process.env.SUNBOWL_QUE_SECURITY_TOKEN;
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/que', (req, res) => {
    const { token, text, user_name, response_url } = req.body;
    // check to see whether this script is being accessed from our slack app
    if (
      token !== QUE_SECURITY_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    /*
    If a developer name is added as an argument, then just get the workload for that person
    otherwise return a summary of developers' workloads.
    */
    const developerName = text;
    if (developerName) {
      res.json({
        text: `Hey ${user_name}, let's see what we can find for ${developerName}...`
      });

      trelloSunbowl
        .getDeveloperWorkload(developerName)
        .then(developerWorkload => {
          const developerSummary = {
            text: `Current projects for ${developerName}`,
            attachments: developerWorkload.map(projectTitle => {
              return { text: projectTitle };
            })
          };
          slackSunbowl.postToSlack(developerSummary, response_url);
        })
        .catch(error => {
          slackSunbowl.postToSlack(
            utils.constructErrorForSlack(error),
            response_url
          );
        });
    } else {
      res.json({
        text: `Hey ${user_name}, compiling the developers' workloads now...`
      });

      trelloSunbowl
        .getDeveloperWorkloads()
        .then(developerWorkloads => {
          const developersSummary = {
            text: 'Current developer workload.',
            attachments: developerWorkloads.map(developer => {
              return { text: `${developer.name}: ${developer.numberOfCards}` };
            })
          };
          slackSunbowl.postToSlack(developersSummary, response_url);
        })
        .catch(error => {
          slackSunbowl.postToSlack(
            utils.constructErrorForSlack(error),
            response_url
          );
        });
    }
  });
};
