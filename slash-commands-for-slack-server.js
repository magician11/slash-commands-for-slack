'use strict';

// include the required modules for the server
let express = require('express');
let FreshBooks = require("freshbooks");

// constants
const PORT = 8080;
const API_URL = process.env.SUNBOWL_URL;
const AUTH_KEY = process.env.SUNBOWL_API_TOKEN;

// objects to use in the app
let freshbooks = new FreshBooks(API_URL, AUTH_KEY);
let app = express();


// routes
app.get('/bucket/:id', function(req, res) {

  let projects = new freshbooks.Project();
  projects.get(req.params.id, function(err, project) {
    res.json({
      bucket_id: req.params.id,
      name: project.name
    });
  });
});

// start the server
app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});
