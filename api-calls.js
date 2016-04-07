'use strict';

/*
The various API calls to freshbooks, trello and formstack
*/

/* FORMSTACK */
const request = require('request');
const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

// grab the trello card ID associated with the passed in channel name
const getTrelloCardId = (channelName) => {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
        json: true,
      },
      (error, response, data) => {
        let trelloCardId;
        data.submissions.forEach((submission) => {
          if (submission.data[38710905].value === channelName) {
            if (submission.data[40296108]) {
              trelloCardId = submission.data[40296108].value;
            }
          }
        });

        if (trelloCardId) {
          resolve(trelloCardId);
        } else {
          reject(`Could not find trello card id for ${channelName}.`);
        }
      });
    });
  };

  /* FRESHBOOKS */

  /* TRELLO */

  const Trello = require('node-trello');
  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
  const trello = new Trello(TRELLO_APP_KEY, TRELLO_USER_TOKEN);

  // find out which checklist is called "Incoming" for the specified card ID
  const getTaskListId = (trelloCardId) => {
    return new Promise((resolve, reject) => {
      trello.get(`/1/cards/${trelloCardId}/checklists`, (err, data) => {
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
          // if it doesn't exist, create the Incoming checklist and resolve with that ID
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

  // add a task to the tasklist
  const addTask = (taskListId, task) => {
    return new Promise((resolve, reject) => {
      trello.post(`/1/checklists/${taskListId}/checkitems`, { name: task }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  };

  const utils = require('./utils');

  const renameTasklist = (taskListId, assignee) => {
    return new Promise((resolve, reject) => {
      const date = utils.dateXdaysFromNow(2);
      trello.put(`/1/checklists/${taskListId}/name`, { value: `${assignee} - ${date}` }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.id);
        }
      });
    });
  };

  // move the trello card to the "Pending to be Assigned" list
  const moveTrelloCard = (trelloCardId) => {
    return new Promise((resolve, reject) => {
      const PENDING_TO_BE_ASSIGNED_LIST_ID = '537bc2cec1db170a09078963';
      trello.put(`/1/cards/${trelloCardId}/idList`, { value: PENDING_TO_BE_ASSIGNED_LIST_ID }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.id);
        }
      });
    });
  };

  // fetch the tasks from a specific check list and return it as a bulleted string
  const getTaskListItems = (checklistId) => {
    return new Promise((resolve, reject) => {
      trello.get(`/1/checklists/${checklistId}/checkitems`, (err, data) => {
        if (err) { reject(err); }

        const bulletListDelimiter = '\n• ';
        const tasks = bulletListDelimiter.concat(data.map((task) => { return task.name; }).join(bulletListDelimiter));
        resolve(tasks);
      });
    });
  };

  /* export the api functions */
  module.exports = {
    getTrelloCardId, getTaskListId, getTaskListItems, addTask, moveTrelloCard, renameTasklist
  };
