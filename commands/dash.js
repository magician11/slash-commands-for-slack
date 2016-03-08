'use strict';

module.exports = function(app) {

  let request = require('request');
  const TRELLO_APP_KEY = process.env.SUNBOWL_TRELLO_KEY;
  const TRELLO_USER_TOKEN = process.env.SUNBOWL_TRELLO_TOKEN;

  // add a task to their trello card
  app.get('/dash', function(req, res) {

    console.log(req);

    let Trello = require("node-trello");
    let trello = new Trello(TRELLO_APP_KEY, TRELLO_USER_TOKEN);

    /*

    using the API from https://developers.trello.com/advanced-reference

    Specifically, to add an item to checklist on a card, get the ID of that checklist.
    Then we can use https://developers.trello.com/advanced-reference/checklist#post-1-checklists-idchecklist-checkitems

    */
    trello.post('/1/checklists/56de0b42541c701599ec3f0d/checkitems', { name: 'do nothing' }, function(err, data){
      console.log(data);
    });

    res.json({
      text: 'Cool... this is working'
    });
  });
}
