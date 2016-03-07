'use strict';

module.exports = function(app) {

  // add a task to their trello card
  app.get('/task', function(req, res) {
    res.json({
      text: 'Cool... this is working'
    });
  });
}
