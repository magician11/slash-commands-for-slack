'use strict';

let FreshBooks = require("freshbooks");
let request = require('request');
let utils = require('../utils');

const FRESHBOOKS_API_URL = process.env.SUNBOWL_FRESHBOOKS_URL;
const FRESHBOOKS_AUTH_KEY = process.env.SUNBOWL_FRESHBOOKS_API_TOKEN;
const BUCKET_SECURITY_TOKEN = process.env.SUNBOWL_BUCKET_SECURITY_TOKEN;
const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;


module.exports = function(app) {

  // get information about a bucket with Sunbowl
  app.get('/bucket', function(req, res) {

    // check to see whether this script is being accessed from our slack integration
    if(req.query.token !== BUCKET_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    // switch on bucket option
    if(req.query.text) {
      switch(req.query.text) {
        case 'refill':

        res.json({
          text: `To refill your bucket, click on your bucket choice below...`,
          'attachments': [
            {
              "title": "7 hour bucket",
              "title_link": "http://www.sunbowl.ca/7hb"
            },
            {
              "title": "21 hour bucket",
              "title_link": "http://www.sunbowl.ca/21hb"
            },
            {
              "title": "28 hour bucket",
              "title_link": "http://www.sunbowl.ca/28hb"
            },
            {
              "title": "40 hour bucket",
              "title_link": "http://www.sunbowl.ca/40hb"
            }
          ]
        });
        break;

        default: utils.respondWithError(`*${req.query.text}* is not a recognised option for the bucket command.`, res);

      }
    } else {

      let freshbooks = new FreshBooks(FRESHBOOKS_API_URL, FRESHBOOKS_AUTH_KEY);

      // get the Slack channel name / Freshbook project ID pairs
      request.get({
        url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
        json: true },
        function(error, response, data){

          let channelNameAndFreshBookIDPair = {};
          data.submissions.forEach(function(submission) {
            channelNameAndFreshBookIDPair[submission.data[38710905].value] = submission.data[38710988].value;
          });

          // then, get the project details (given project_id retrieve name and budget)
          let projects = new freshbooks.Project();
          let projectID = channelNameAndFreshBookIDPair[req.query.channel_name];
          projects.get(projectID, function(err, project) {

            // catch any project ID errors (e.g. NAN or project ID not found)
            if(err) {
              utils.respondWithError(err, res);
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

              let projectBudget = parseInt(project.budget);
              let percentBucketUsed = (billableHours / projectBudget) * 100;
              let timeLeft = projectBudget - billableHours;
              let progressColour = (percentBucketUsed > 75) ? 'danger' : 'good';

              // return the JSON for this request
              res.json({
                text: `You have used \`${percentBucketUsed.toFixed()}%\` of your \`${projectBudget} hour\` bucket.`,
                'attachments': [
                  {
                    color: progressColour,
                    text: `\`${timeLeft.toFixed(1)} hours\` left before you will need to top it up.`,
                    mrkdwn_in: ["text"]
                  }
                ]
              });
            });
          });
        });
      }
    });
  }
