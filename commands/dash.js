'use strict';

module.exports = function(app) {

  let request = require('request');
  let utils = require('../utils');

  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
  const DASH_SECURITY_TOKEN = process.env.SUNBOWL_DASH_SECURITY_TOKEN;
  const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

  // add a task to their trello card
  app.get('/dash', function(req, res) {

    // check to see whether this script is being accessed from our slack integration
    if(req.query.token !== DASH_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if(req.query.text === '') {
      utils.respondWithError('No task was specified.', res);
      return;
    }

    let Trello = require("node-trello");
    let trello = new Trello(TRELLO_APP_KEY, TRELLO_USER_TOKEN);

    // first grab the trello card ID associated with this channel
    request.get(
      {
        url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
        json: true
      },
      function(error, response, data) {

        let trelloCardId;
        data.submissions.forEach(function(submission) {
          if(submission.data[38710905].value === req.query.channel_name) {
            trelloCardId = submission.data[40296108].value;
          }
        });

        if(trelloCardId) {
          // then find out which checklist is called "Incoming" for the specified card ID
          trello.get(`/1/cards/${trelloCardId}/checklists`, function(err, data) {

            let checklistId;
            data.forEach(function(checklist) {
              if(checklist.name === 'Incoming') {
                checklistId = checklist.id;
              }
            });

            // if a checklist with named "Incoming" is found, then add the latest task to this list
            if(checklistId) {
              trello.post(`/1/checklists/${checklistId}/checkitems`, { name: req.query.text }, function(err, data) {
                res.json({
                  'response_type': 'in_channel',
                  text: `Great! Your task *${ req.query.text }* was added.`
                });
              });
            } else {
              utils.respondWithError('The "Incoming" checklist has not been setup for your trello card.', res);
            }
          });
        } else {
          utils.respondWithError('No trello card was found for this channel.', res);
        }
      }
    );
  });
}
