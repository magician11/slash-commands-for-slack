'use strict';

module.exports = (app) => {
  const utils = require('../utils');
  const apiCalls = require('../api-calls');
  const COMPLETE_SECURITY_TOKEN = process.env.SUNBOWL_COMPLETE_SECURITY_TOKEN;

  // notify someone that a sprint for a channel is complete
  app.get('/complete', (req, res) => {
    const completeArguments = req.query.text.split(' ');

    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== COMPLETE_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (completeArguments.length < 3) {
      utils.respondWithError('Usage: /complete [recipient] [time used/time budgeted] [video url]', res);
      return;
    }

    res.json({
      text: 'We\'re processing your request. One moment please...'
    });

    const recipient = completeArguments[0];
    const bucketTimes = completeArguments[1].split('/');
    const bucketTimeQuoted = bucketTimes[0];
    const bucketTimeUsed = bucketTimes[1];
    let videoUrl;
    let description;

    if (completeArguments[2].startsWith('http')) {
      videoUrl = completeArguments[2];
      description = completeArguments.slice(3).join(' ');
    } else {
      description = completeArguments.slice(2).join(' ');
    }

    const channelName = req.query.channel_name;
    const freshbooksData = {};

    apiCalls.getFreshbooksProjectId(channelName)
    .then((freshbooksProjectId) => {freshbooksData.projectId = freshbooksProjectId; return apiCalls.getProjectBudget(freshbooksProjectId); })
    .then((projectBudget) => {freshbooksData.projectBudget = projectBudget; return apiCalls.getBillableHours(freshbooksData.projectId);})
    .then((billableHours) => {freshbooksData.billableHours = billableHours; return apiCalls.addTimeEntry(req.query.user_name, channelName, 0.25, 'Reviewed developer work, made update video, sprint update post.');})
    .then(() => {
      const timeLeft = freshbooksData.projectBudget - freshbooksData.billableHours;

      const completeMessage = {
        response_type: 'in_channel',
        text: `${recipient} *Your Sprint is Complete!*
${description}
${videoUrl ? `Sprint Review: <${videoUrl}|:arrow_forward: Watch Video>` : ''}
*Bucket Time Quoted*: \`${bucketTimeQuoted} hrs\`
*Bucket Time Used*: \`${bucketTimeUsed} hrs\`
Remaining Bucket Balance: \`${timeLeft.toFixed(1)} hrs\``
      };

      apiCalls.postToSlack(completeMessage, req.query.response_url);
    });
  });
};
