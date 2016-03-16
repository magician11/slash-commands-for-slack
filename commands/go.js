'use strict';

module.exports = (app) => {
  const request = require('request');
  const utils = require('../utils');

  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
  const GO_SECURITY_TOKEN = process.env.SUNBOWL_GO_SECURITY_TOKEN;
  const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

  // add a task to their trello card
  app.get('/go', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== GO_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }
    const Trello = require('node-trello');
    const trello = new Trello(TRELLO_APP_KEY, TRELLO_USER_TOKEN);

    // first grab the trello card ID associated with this channel
    const getTrelloCardId = new Promise((resolve, reject) => {
      request.get(
        {
          url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
          json: true,
        },
        (error, response, data) => {
          let trelloCardId;
          data.submissions.forEach((submission) => {
            if (submission.data[38710905].value === req.query.channel_name) {
              if (submission.data[40296108]) {
                trelloCardId = submission.data[40296108].value;
              }
            }
          });

          trelloCardId ? resolve(trelloCardId) : reject(`Could not find trello card id for ${req.query.channel_name}.`);
        });
      });

      const moveTrelloCard = (trelloCardId) => {
        return new Promise((resolve, reject) => {
          // move the trello card to the "Pending to be Assigned" list
          const PENDING_TO_BE_ASSIGNED_LIST_ID = '537bc2cec1db170a09078963';
          trello.put(`/1/cards/${trelloCardId}/idList`, { value: PENDING_TO_BE_ASSIGNED_LIST_ID }, (err, data) => {
            resolve(data.id);
          });
        });
      };

      const getChecklistId = (trelloCardId) => {
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
              reject('No tasks were found.');
            }
          });
        });
      };

      const renameChecklist = (checklistId) => {
        return new Promise((resolve, reject) => {
          const date = new Date();
          trello.put(`/1/checklists/${ checklistId }/name`, { value: `Sprint - ${date}` }, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
      };

      getTrelloCardId
      .then(moveTrelloCard)
      .then(getChecklistId)
      .then(renameChecklist)
      .then(() => {
        res.json({
          response_type: 'in_channel',
          text: 'A new sprint has been created for you.',
        });
      })
      .catch((error) => {
        utils.respondWithError(error, res);
      });
    });
  };
