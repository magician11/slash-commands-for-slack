/* TRELLO */

const Trello = require('node-trello');
const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
const trello = new Trello(TRELLO_APP_KEY, TRELLO_USER_TOKEN);
const utils = require('./utils');

class SunbowlTrello {
  // find out which checklist is called "Incoming" for the specified card ID
  getTaskListId(trelloCardId) {
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
  }

  // add a task to the tasklist
  addTask(taskListId, task) {
    return new Promise((resolve, reject) => {
      trello.post(`/1/checklists/${taskListId}/checkitems`, { name: task }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  renameTasklist(taskListId, assignee) {
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
  }

  moveTaskListToTop(taskListId) {
    return new Promise((resolve, reject) => {
      trello.put(`/1/checklists/${taskListId}/pos`, { value: 'top' }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.id);
        }
      });
    });
  }

  setDueDate(trelloCardId) {
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
  }

  findListId(listName) {
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
          reject(`We don't seem to have a "${listName}" to assign this to.`);
        }
      });
    });
  }

  // move the trello card to a particular list
  moveTrelloCard(trelloCardId, listId) {
    return new Promise((resolve, reject) => {
      trello.put(`/1/cards/${trelloCardId}/idList`, { value: listId }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.id);
        }
      });
    });
  }

  // fetch the tasks from a specific check list and return it as a bulleted string
  getTaskListItems(checklistId) {
    return new Promise((resolve, reject) => {
      trello.get(`/1/checklists/${checklistId}/checkitems`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
}

module.exports = new SunbowlTrello();
