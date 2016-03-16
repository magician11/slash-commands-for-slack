'use strict';

module.exports = (app) => {
  const request = require('request');
  const utils = require('../utils');

  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
  const DASH_SECURITY_TOKEN = process.env.SUNBOWL_DASH_SECURITY_TOKEN;
  const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

  // add a task to their trello card
  app.get('/dash', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== DASH_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (req.query.text === '') {
      utils.respondWithError('No task was specified. Usage: /dash [the task you want to add]', res);
      return;
    }

    const Trello = require('node-trello');
    const trello = new Trello(TRELLO_APP_KEY, TRELLO_USER_TOKEN);

    // first grab the trello card ID associated with this channel
    const getTrelloCardId = new Promise((resolve, reject) => {
      request.get(
        {
          url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
          json: true
        },
        function(error, response, data) {

          let trelloCardId;
          data.submissions.forEach(function(submission) {
            if (submission.data[38710905].value === req.query.channel_name) {
              if (submission.data[40296108]) {
                trelloCardId = submission.data[40296108].value;
              }
            }
          });

          trelloCardId ? resolve(trelloCardId) : reject(`Could not find trello card id for ${req.query.channel_name}.`);
        });
      });

      const getChecklistId = function(trelloCardId) {
        return new Promise((resolve, reject) => {
          trello.get(`/1/cards/${trelloCardId}/checklists`, (err, data) => {

            // then find out which checklist is called "Incoming" for the specified card ID
            const CHECKLIST_NAME = 'Incoming';
            let checklistId;
            data.forEach((checklist) => {
              if (checklist.name === CHECKLIST_NAME) {
                checklistId = checklist.id;
              }
            });

            if (checklistId) {
              resolve(checklistId);
            } else {
              //create the Incoming checklist and resolve with that ID
              trello.post(`/1/cards/${trelloCardId}/checklists`, { name: CHECKLIST_NAME }, function(err, data) {
                if (err) {
                  reject(err);
                }
                resolve(data.id);
              });
            }
          });
        });
      };

      getTrelloCardId
      .then(getChecklistId)
      .then((checklistId) => {
        trello.post(`/1/checklists/${checklistId}/checkitems`, { name: req.query.text }, function(err, data) {
          res.json({
            response_type: 'in_channel',
            text: `Great! Your task *${ req.query.text }* was added.`
          });
        });
      })
      .catch((error) => {
        utils.respondWithError(error, res);
      });
    });
  };
