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

// convenience method that wraps the dateXdaysFromNow
function dateNow() {
  return dateXdaysFromNow(0);
}

function createBulletListFromArray(data) {
  const bulletListDelimiter = '\n• ';
  const tasks = bulletListDelimiter.concat(data.map((task) => { return task.name; }).join(bulletListDelimiter));
  return tasks;
}

module.exports = {
  respondWithError, dateXdaysFromNow, createBulletListFromArray, dateNow
};
