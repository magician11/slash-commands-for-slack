/*
Process incoming interactions from the slack channel, like buttons
*/

module.exports = app => {
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;

  app.post('/action', (req, res) => {
    const slackMessage = JSON.parse(req.body.payload);

    switch (slackMessage.callback_id) {
      case 'review_tasks':
        const response = slackMessage.actions[0].value === 'confirm'
          ? 'great..we will make that happen for you'
          : 'ok, let nic know what you want changed';
        res.json({ text: response });
    }

    console.log(JSON.stringify(slackMessage, null, 2));
  });
};
