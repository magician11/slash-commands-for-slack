/* Trello */

const Trello = require("node-trello");
const config = require("../security/auth.js").get(process.env.NODE_ENV);
const trello = new Trello(config.trello.key, config.trello.token);
const utils = require("./utils");

class SunbowlTrello {
  // find out which checklist is called "Incoming" for the specified card ID
  getTaskListId(trelloCardId) {
    return new Promise((resolve, reject) => {
      trello.get(`/1/cards/${trelloCardId}/checklists`, (err, data) => {
        const CHECKLIST_NAME = "Incoming";
        let checklistId;
        data.forEach(checklist => {
          if (checklist.name === CHECKLIST_NAME) {
            checklistId = checklist.id;
          }
        });

        if (checklistId) {
          resolve(checklistId);
        } else {
          // if it doesn't exist, create the Incoming checklist and resolve with that ID
          trello.post(
            `/1/cards/${trelloCardId}/checklists`,
            { name: CHECKLIST_NAME },
            (error, incomingChecklist) => {
              if (error) {
                reject(error);
              }
              resolve(incomingChecklist.id);
            }
          );
        }
      });
    });
  }

  // add a task to the tasklist
  addTask(taskListId, task) {
    return new Promise((resolve, reject) => {
      trello.post(
        `/1/checklists/${taskListId}/checkitems`,
        { name: task },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }
      );
    });
  }

  renameTasklist(taskListId, assignee) {
    return new Promise((resolve, reject) => {
      const date = utils.formatDate(new Date());
      trello.put(
        `/1/checklists/${taskListId}/name`,
        { value: `${assignee} - ${date}` },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        }
      );
    });
  }

  moveTaskListToTop(taskListId) {
    return new Promise((resolve, reject) => {
      trello.put(
        `/1/checklists/${taskListId}/pos`,
        { value: "top" },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        }
      );
    });
  }

  setDueDate(trelloCardId) {
    return new Promise((resolve, reject) => {
      const date = utils.dateXdaysFromNow(2);
      trello.put(
        `/1/cards/${trelloCardId}/due`,
        { value: date },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        }
      );
    });
  }

  findListId(listName) {
    return new Promise((resolve, reject) => {
      trello.get(`/1/boards/${config.trello.sunbowlBoardId}/lists`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          for (const list of data) {
            if (list.name === listName) {
              resolve(list.id);
            }
          }
          reject(
            `Sorry, I couldn't find the list ${listName} on the Sunbowl board.`
          );
        }
      });
    });
  }

  // move the trello card to a particular list
  moveTrelloCard(trelloCardId, listId) {
    return new Promise((resolve, reject) => {
      trello.put(
        `/1/cards/${trelloCardId}/idList`,
        { value: listId },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.id);
          }
        }
      );
    });
  }

  // fetch the tasks from a specific check list
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

  // get the list of card names from a specific list given a list id
  getCardNamesFromList(listId) {
    return new Promise((resolve, reject) => {
      trello.get(`/1/lists/${listId}/cards`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.map(card => card.name));
        }
      });
    });
  }

  // get the list of card names for this developer
  getDeveloperWorkload(developer) {
    return new Promise((resolve, reject) => {
      this.findListId(developer)
        .then(listId => {
          trello.get(`/1/lists/${listId}/cards`, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data.map(card => card.name));
            }
          });
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // return an array of objects of the form {developer: numberOfCards}
  getDeveloperWorkloads() {
    return new Promise((resolve, reject) => {
      trello.get(`/1/boards/${config.trello.sunbowlBoardId}/lists`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const developers = [];
          for (const list of data) {
            if (list.name.startsWith("@")) {
              developers.push(
                new Promise(done => {
                  trello.get(
                    `/1/lists/${list.id}/cards`,
                    (cardDataError, cardData) => {
                      done({
                        name: list.name,
                        numberOfCards: cardData.length
                      });
                    }
                  );
                })
              );
            }
          }

          Promise.all(developers).then(developerWorkloads => {
            resolve(developerWorkloads);
          });
        }
      });
    });
  }

  // for a card ID, find the list ID it's on and then get the list name
  getListNameForCard(trelloCardId) {
    return new Promise((resolve, reject) => {
      trello.get(`/1/cards/${trelloCardId}/idList`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          trello.get(`/1/lists/${data._value}/name`, (error, listData) => {
            if (error) {
              reject(error);
            } else {
              resolve(listData._value);
            }
          });
        }
      });
    });
  }

  getCardDescription(trelloCardId) {
    return new Promise((resolve, reject) => {
      trello.get(`/1/cards/${trelloCardId}/desc`, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data._value);
        }
      });
    });
  }
}

module.exports = new SunbowlTrello();
