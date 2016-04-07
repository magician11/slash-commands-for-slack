/*
utility functions
*/

function respondWithError(err, res) {
  res.json({
    text: 'There was an error with your request.',
    attachments: [
      {
        color: 'danger',
        text: err.toString(),
        mrkdwn_in: ['text']
      }
    ]
  });
}

module.exports = {
  respondWithError
};
