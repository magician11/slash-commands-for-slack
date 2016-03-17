'use strict';

module.exports = (app) => {
  const request = require('request');
  const utils = require('../utils');

  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
  const REVIEW_SECURITY_TOKEN = process.env.SUNBOWL_REVIEW_SECURITY_TOKEN;
  const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

  // add a task to their trello card
  app.get('/review', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== REVIEW_SECURITY_TOKEN) {
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

      getTrelloCardId
      .then(getChecklistId)
      .then((checklistId) => {
        trello.get(`/1/checklists/${checklistId}/checkitems`, (err, data) => {
          let tasks = [];
          data.forEach((task) => {
            tasks.push({ title: task.name });
          });

          res.json({
            response_type: (req.query.text === 'public') ? 'in_channel' : 'ephemeral',
            text: 'Here are your current tasks...',
            attachments: tasks,
          });
      });
    })
    .catch((error) => {
      utils.respondWithError(error, res);
    });
  });
};
