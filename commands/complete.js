'use strict';

module.exports = (app) => {
  const utils = require('../utils');
  const apiCalls = require('../api-calls');
  const COMPLETE_SECURITY_TOKEN = process.env.SUNBOWL_COMPLETE_SECURITY_TOKEN;

  // notify someone that a sprint for a channel is complete
  app.get('/complete', (req, res) => {
    // res.json({
    //   text: 'We\'re processing your request. One moment please...'
    // });
    const completeArguments = req.query.text.split(' ');

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== COMPLETE_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (completeArguments.length < 2) {
      utils.respondWithError('Usage: /complete [recipient] [time used/time budgeted] [video url]', res);
      return;
    }

    const recipient = completeArguments[0];
    const bucketTimes = completeArguments[1].split('/');
    const bucketTimeUsed = bucketTimes[0];
    const bucketTimeQuoted = bucketTimes[1];
    const videoUrl = completeArguments[2];

    apiCalls.getFreshbooksProjectId(req.query.channel_name)
    .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return apiCalls.getProjectBudget(freshbooksProjectId); })
    .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return apiCalls.getBillableHours(freshbooksData.projectId);})
    .then((billableHours) => {
      const percentBucketUsed = (billableHours / freshbooksData.projectBudget) * 100;
      const timeLeft = freshbooksData.projectBudget - billableHours;

      res.json({
        text: `${recipient} *Your Sprint is Complete!*
${videoUrl ? `Video overview of sprint: <${videoUrl}|click here>` : ''}
Bucket Time Quoted: \`${bucketTimeQuoted}\`
Bucket Time Used: \`${bucketTimeUsed}\`
Bucket balance:  You have \`${timeLeft.toFixed(1)} hours\` left.`
      });
    });
  });
};