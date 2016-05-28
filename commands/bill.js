module.exports = (app) => {
  const apiCalls = require('../api-calls');
  const utils = require('../utils');
  const BILL_SECURITY_TOKEN = process.env.SUNBOWL_BILL_SECURITY_TOKEN;

  // bill Sunbowl for a particular channel with an hour amount and description/URL
  app.get('/bill', (req, res) => {
    // check to see whether this script is being accessed from our slack integration
    if (req.query.token !== BILL_SECURITY_TOKEN) {
      utils.respondWithError('Access denied.', res);
      return;
    }

    const channelName = req.query.channel_name;
    const parameters = req.query.text.split(' ');
    const timeToBeBilled = parameters[0];
    let jobNotes;

    if (parameters[1].startsWith('http')) {
      console.log('todo: shorten URL');
      jobNotes = parameters[1];
    } else {
      jobNotes = parameters.slice(1).join(' ');
    }

    apiCalls.addTimeEntry(req.query.user_name, channelName, timeToBeBilled, jobNotes)
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
