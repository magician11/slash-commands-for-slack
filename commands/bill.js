'use strict';

module.exports = (app) => {
  const apiCalls = require('../api-calls');
  const utils = require('../utils');
  const BILL_SECURITY_TOKEN = process.env.SUNBOWL_BILL_SECURITY_TOKEN;

  // bill Sunbowl for a particular channel with an hour amount and description/URL
  app.get('/bill', (req, res) => {
    const billParameters = req.query.text.split(' ');
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== BILL_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    } else if (billParameters.length < 2) {
      utils.respondWithError('Usage: /bill [hours] [description/video url]', res);
      return;
    }

    const channelName = req.query.channel_name;
    const timeToBeBilled = billParameters[0];

    (billParameters[1].startsWith('http') ? utils.shortenUrl(billParameters[1]) : Promise.resolve(billParameters.slice(1).join(' ')))
    .then((jobNotes) => apiCalls.addTimeEntry(req.query.user_name, channelName, timeToBeBilled, jobNotes))
    .then((timeEntry) => {
      res.json({
        text: 'Your time was successfully logged.',
        attachments: [
          {
            title: channelName,
            color: 'good',
            text: `\`${timeEntry.hours} hours\` logged for \`${timeEntry.notes}\``,
            mrkdwn_in: ['text']
          }
        ]
      });
    })
    .catch((err) => {
      utils.respondWithError(`Error: ${err}`, res);
    });
  });
};
