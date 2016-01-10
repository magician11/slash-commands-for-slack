// include the required modules for the server
var http = require('http');
var dispatch = require('dispatch');

//the port we want to listen to
const PORT = 8080;
const API_URL = 'https://your-domain.freshbooks.com/api/2.1/xml-in';
const AUTH_KEY = 'yourkey';

// create the server and setup routes
var server = http.createServer(
  dispatch({
    '/bucket/:id': function(req, res, id) {
      res.end('Looking at bucket with id: ' + id);
    }
  })
);

// start the server on the specfied port
server.listen(PORT, function(){
  console.log("Server listening on: http://localhost:%s", PORT);

  var FreshBooks = require("freshbooks");
  var freshbooks = new FreshBooks(API_URL, AUTH_KEY);
  var projects = new freshbooks.Project();
  projects.list(function(err, list) {
    console.log(list);
  });
});
