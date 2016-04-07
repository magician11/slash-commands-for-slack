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

// returns a string date in the format e.g. Sat Apr 09 2016
function dateXdaysFromNow(numberOfDays) {
  const rightNow = new Date();
  const futureDate = new Date(rightNow.setTime(rightNow.getTime() + numberOfDays * 86400000));
  return futureDate.toString().split(' ').slice(0, 4).join(' ');
}

module.exports = {
  respondWithError, dateXdaysFromNow
};
