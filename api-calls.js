'use strict';

/*
The various API calls to freshbooks, trello and formstack
*/

/* GLOBALS FOR API CALLS */
const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

/* FORMSTACK */
const request = require('request');

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

  // get the freshbooks ID associated with this channel name from formstack
  const getFreshbooksProjectId = (channelName) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
        json: true },
        (error, response, data) => {
          if (error) {
            reject(error);
          } else {
            const channelNameAndFreshBookIDPair = {};
            data.submissions.forEach((submission) => {
              channelNameAndFreshBookIDPair[submission.data[38710905].value] = submission.data[38710988].value;
            });
            // freshbooksData.projectId = channelNameAndFreshBookIDPair[channelName];
            if (channelNameAndFreshBookIDPair[channelName]) {
              resolve(channelNameAndFreshBookIDPair[channelName]);
            } else {
              reject(`${channelName} is not registered with formstack.`);
            }
          }
        });
      });
    };

    /* FRESHBOOKS */
    const FreshBooks = require('freshbooks');
    const FRESHBOOKS_API_URL = process.env.SUNBOWL_FRESHBOOKS_URL;
    const FRESHBOOKS_AUTH_KEY = process.env.SUNBOWL_FRESHBOOKS_API_TOKEN;
    const freshbooks = new FreshBooks(FRESHBOOKS_API_URL, FRESHBOOKS_AUTH_KEY);

    const getProjectBudget = (projectId) => {
      return new Promise((resolve, reject) => {
        const projects = new freshbooks.Project();
        projects.get(projectId, (err, project) => {
          if (err) {
            reject('Could not find a project setup for this channel in Freshbooks.');
          } else {
            resolve(parseInt(project.budget, 10));
          }
        });
      });
    };

    const getBillableHours = (projectId) => {
      function sumTimes(times) {
        let billableHours = 0;
        for (const time of times) {
          billableHours += parseFloat(time.hours);
        }

        return billableHours;
      }

      return new Promise((resolve, reject) => {
        const timeEntries = new freshbooks.Time_Entry();
        let billableHours = 0;
        timeEntries.list({ project_id: projectId, per_page: 100 }, (err, times, options) => {
          if (err) {
            reject(err);
          } else {
            // grab the first page of times
            billableHours = sumTimes(times);

            // if there are more pages to process, get those...
            if (options.pages > 1) {
              const pagesToProcess = [];
              for (let i = 2; i <= options.pages; i++) {
                pagesToProcess.push(new Promise((done) => {
                  timeEntries.list({ project_id: projectId, per_page: 100, page: i }, (error, moreTimes) => {
                    const extraHours = sumTimes(moreTimes);

                    done(extraHours);
                  });
                }));
              }

              Promise.all(pagesToProcess).then((extraTimes) => {
                billableHours = billableHours + extraTimes.reduce((a, b) => { return a + b; });
                resolve(billableHours);
              });
            } else {
              resolve(billableHours);
            }
          }
        });
      });
    };

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
            trello.post(`/1/cards/${trelloCardId}/checklists`, { name: CHECKLIST_NAME }, (error, incomingChecklist) => {
              if (error) {
                reject(error);
              }
              resolve(incomingChecklist.id);
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
        const date = utils.formatDate(new Date());
        trello.put(`/1/checklists/${taskListId}/name`, { value: `${assignee} - ${date}` }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        });
      });
    };

    const moveTaskListToTop = (taskListId) => {
      return new Promise((resolve, reject) => {
        trello.put(`/1/checklists/${taskListId}/pos`, { value: 'top' }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        });
      });
    };

    const setDueDate = (trelloCardId) => {
      return new Promise((resolve, reject) => {
        const date = utils.dateXdaysFromNow(2);
        trello.put(`/1/cards/${trelloCardId}/due`, { value: date }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        });
      });
    };

    const findListId = (listName) => {
      const SUNBOWL_BOARD_ID = 'd9ntWOEO';
      return new Promise((resolve, reject) => {
        trello.get(`/1/boards/${SUNBOWL_BOARD_ID}/lists`, (err, data) => {
          if (err) {
            reject(err);
          } else {
            for (const list of data) {
              if (list.name === listName) {
                resolve(list.id);
              }
            }
            reject(`There was no list called "${listName}" found in trello.`);
          }
        });
      });
    };

    // move the trello card to a particular list
    const moveTrelloCard = (trelloCardId, listId) => {
      return new Promise((resolve, reject) => {
        trello.put(`/1/cards/${trelloCardId}/idList`, { value: listId }, (err, data) => {
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
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    };

    /* SLACK */

    function postToSlack(message, url) {
      const options = {
        uri: url,
        json: message
      };

      request.post(options);
    }

    /* export the api functions */
    module.exports = {
      getTrelloCardId, getTaskListId, getTaskListItems, getProjectBudget, postToSlack, moveTaskListToTop,
      addTask, moveTrelloCard, renameTasklist, getFreshbooksProjectId, getBillableHours, setDueDate, findListId
    };
