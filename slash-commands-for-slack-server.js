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
    console.log(project);
    res.json({
      project_id: project.project_id,
      name: project.name,
      client_id: project.client_id,
      budget: project.budget
    });
  });
});

// start the server
app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});
