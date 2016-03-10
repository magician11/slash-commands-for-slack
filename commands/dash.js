'use strict';

module.exports = function(app) {

  let request = require('request');
  let utils = require('../utils');

  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;
  const DASH_SECURITY_TOKEN = process.env.SUNBOWL_DASH_SECURITY_TOKEN;

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

    /*

    using the API from https://developers.trello.com/advanced-reference

    Specifically, to add an item to checklist on a card, get the ID of that checklist.
    Then we can use https://developers.trello.com/advanced-reference/checklist#post-1-checklists-idchecklist-checkitems

    */

    // first find out which checklist is called "Incoming" for the specified card ID
    trello.get('/1/cards/wIhFjOWZ/checklists', function(err, data) {

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
  });
}
