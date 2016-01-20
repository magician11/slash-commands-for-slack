'use strict';

// include the required modules for the server
let express = require('express');
let FreshBooks = require("freshbooks");
let Client = require('node-rest-client').Client;

// constants
const PORT = 8080;
const API_URL = process.env.SUNBOWL_URL;
const AUTH_KEY = process.env.SUNBOWL_API_TOKEN;

// objects to use in the app
let freshbooks = new FreshBooks(API_URL, AUTH_KEY);
let app = express();
let client = new Client();
let channelNameAndFreshBookIDPair = {};

// routes

// get the hours billed and available for a current bucket
app.get('/bucket', function(req, res) {

  // get the Slack channel name / Freshbook project ID pairs
  client.get("https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&oauth_token=b9400c279dd0dfcd22dc47c3282c7173", function(data, response){

    let formData = JSON.parse(data.toString('utf8'));

    formData.submissions.forEach(function(submission) {
      channelNameAndFreshBookIDPair[submission.data[38710905].value] = submission.data[38710988].value;
    });

    console.log(channelNameAndFreshBookIDPair);
  });

  // get the project details (project_id, name, budget)
  let projects = new freshbooks.Project();
  let projectID = parseInt(req.query.text);
  projects.get(projectID, function(err, project) {

    // catch any project ID errors (e.g. NAN or project ID not found)
    if(err) {
      respondWithError(err, res);
      return;
    }

    // get the times entered for this project
    let times = new freshbooks.Time_Entry();
    times.list({project_id: projectID, per_page: 99999}, function(err, times) {

      // sum the hours that are billable
      let billableHours = 0;
      for(let time of times) {
        billableHours += parseFloat(time.hours);
      }

      // return the JSON for this request
      res.json({
        text: `You have used ${billableHours.toFixed(1)} hours of your ${parseInt(project.budget)} hour budget.`,
        'attachments': [
          {
            text: `This is for ${project.name} with ID ${project.project_id}.`
          }
        ]
      });
    });
  });
});

// utility functions
function respondWithError(err, res) {
  res.json({
    text: 'There was an error with your request.',
    'attachments': [
      {
        text: err.toString()
      }
    ]
  });
}

// start the server
app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);
});
