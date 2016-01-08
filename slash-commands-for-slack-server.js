// include the required modules for the server
var http = require('http');
var dispatch = require('dispatch');

//the port we want to listen to
const PORT = 8080;

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
  //Callback triggered when server is successfully listening. Hurray!a
  console.log("Server listening on: http://localhost:%s", PORT);
});
