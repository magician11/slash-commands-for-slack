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

// get the hours billed and available for a current bucket
app.get('/bucket/:id', function(req, res) {

  // get the project details (project_id, name, client_id, budget)
  let projects = new freshbooks.Project();
  projects.get(req.params.id, function(err, project) {

    // get the times entered for this project
    let times = new freshbooks.Time_Entry();
    times.list({project_id: req.params.id, per_page: 99999}, function(err, times) {

      // sum the hours that are billable
      let billableHours = 0;
      for(let time of times) {
        billableHours += parseFloat(time.hours);
      }

      // return the JSON for this request
      res.json({
        project_id: project.project_id,
        name: project.name,
        budget: parseInt(project.budget),
        billableHours: billableHours
      });
    });
  });
});

// start the server
app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});
