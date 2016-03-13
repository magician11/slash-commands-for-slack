'use strict';

module.exports = function(app) {

  let FreshBooks = require("freshbooks");
  let request = require('request');
  let utils = require('../utils');

  const FRESHBOOKS_API_URL = process.env.SUNBOWL_FRESHBOOKS_URL;
  const FRESHBOOKS_AUTH_KEY = process.env.SUNBOWL_FRESHBOOKS_API_TOKEN;
  const BUCKET_SECURITY_TOKEN = process.env.SUNBOWL_BUCKET_SECURITY_TOKEN;
  const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;

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
      let freshbooksData = {};

      let getFreshbooksProjectId = new Promise((resolve, reject) => {
        request.get({
          url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
          json: true },
          function(error, response, data) {
            if(error) {
              reject(error);
            } else {

              let channelNameAndFreshBookIDPair = {};
              data.submissions.forEach(function(submission) {
                channelNameAndFreshBookIDPair[submission.data[38710905].value] = submission.data[38710988].value;
              });
              freshbooksData.projectId = channelNameAndFreshBookIDPair[req.query.channel_name];
              console.log("Found projectID: " + channelNameAndFreshBookIDPair[req.query.channel_name]);
              resolve(channelNameAndFreshBookIDPair[req.query.channel_name]);
            }
          });
        });

        let getProjectBudget = function(projectId) {
          return new Promise((resolve, reject) => {
            let projects = new freshbooks.Project();
            projects.get(projectId, function(err, project) {
              if(err) {
                reject(err);
              } else {
                freshbooksData.projectBudget = parseInt(project.budget);
                console.log(`Found budget: ${freshbooksData.projectBudget}`);
                resolve(projectId);
              }
            });
          });
        };

        let getBillableHours = function(projectId) {
          return new Promise((resolve, reject) => {
            let timeEntries = new freshbooks.Time_Entry();
            let billableHours = 0;
            timeEntries.list({project_id: projectId, per_page: 100}, function(err, times, options) {

              console.log(options);

              if(err) {
                reject(err);
              } else {

                for(let time of times) {
                  billableHours += parseFloat(time.hours);
                }

                // if there are more pages...
                if(options.pages > 1) {
                  console.log('Going to get more pages...');
                  timeEntries.list({project_id: projectId, per_page: 100, page: 2 }, function(err, times, options) {
                    for(let time of times) {
                      billableHours += parseFloat(time.hours);
                    }
                    freshbooksData.billableHours = billableHours;
                    resolve(billableHours);

                  });
                } else {
                  freshbooksData.billableHours = billableHours;
                  console.log(`Found billable hours: ${billableHours}`);
                  resolve(billableHours);
                }
              }
            });
          });
        };

        getFreshbooksProjectId
        .then(getProjectBudget)
        .then(getBillableHours)
        .then(() => {
          console.log(freshbooksData);

          let percentBucketUsed = (freshbooksData.billableHours / freshbooksData.projectBudget) * 100;
          let timeLeft = freshbooksData.projectBudget - freshbooksData.billableHours;
          let progressColour = (percentBucketUsed > 75) ? 'danger' : 'good';

          // return the JSON for this request
          res.json({
            text: `You have used \`${percentBucketUsed.toFixed()}%\` of your \`${freshbooksData.projectBudget} hour\` bucket.`,
            'attachments': [
              {
                color: progressColour,
                text: `\`${timeLeft.toFixed(1)} hours\` left before you will need to top it up.`,
                mrkdwn_in: ["text"]
              }
            ]
          });
          // });
        })
        .catch(function(err){
          console.log(`Error: ${err}`);
        });

        //let getProjectId = function()

        // get the Slack channel name / Freshbook project ID pairs
        // request.get({
        //   url: `https://www.formstack.com/api/v2/form/2198788/submission.json?data=true&per_page=100&oauth_token=${FORMSTACK_TOKEN}`,
        //   json: true },
        //   function(error, response, data) {
        //
        //
        //
        //     // then, get the project details (given project_id retrieve name and budget)
        //     let projects = new freshbooks.Project();
        //     projects.get(projectID, function(err, project) {
        //
        //       // catch any project ID errors (e.g. NAN or project ID not found)
        //       if(err) {
        //         utils.respondWithError(err, res);
        //         return;
        //       }
        //
        //       // get the times entered for this project
        //       let timeEntries = new freshbooks.Time_Entry();
        //       let billableHours = 0;
        //       timeEntries.list({project_id: projectID, per_page: 100}, function(err, timesToNotUse, options) {
        //
        //         //console.log(options);
        //
        //         for (let i = 1; i <= options.pages; i++) {
        //           //console.log(`page ${i}\n-----------------`)
        //           timeEntries.list({project_id: projectID, per_page: 100, page: i }, function(err, times, options) {
        //
        //             // console.log(options);
        //             // console.log(times.length);
        //
        //             for(let time of times) {
        //               billableHours += parseFloat(time.hours);
        //             }
        //           });
        //         }
        //
        //         let projectBudget = parseInt(project.budget);
        //         let percentBucketUsed = (billableHours / projectBudget) * 100;
        //         let timeLeft = projectBudget - billableHours;
        //         let progressColour = (percentBucketUsed > 75) ? 'danger' : 'good';
        //
        //         // return the JSON for this request
        //         res.json({
        //           text: `You have used \`${percentBucketUsed.toFixed()}%\` of your \`${projectBudget} hour\` bucket.`,
        //           'attachments': [
        //             {
        //               color: progressColour,
        //               text: `\`${timeLeft.toFixed(1)} hours\` left before you will need to top it up.`,
        //               mrkdwn_in: ["text"]
        //             }
        //           ]
        //         });
        //       });
        //
        //     });
        // });
      }
    });
  }
