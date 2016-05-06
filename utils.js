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

  // if the due date (2 days from now) falls on the weekend, shift that due date to Monday
  let weekendOffset;
  switch (rightNow.getDay()) {
    case 4: weekendOffset = 2; break; // Thursday
    case 5: weekendOffset = 1; break; // Friday
    default: weekendOffset = 0;
  }

  const futureDate = new Date(rightNow.setTime(rightNow.getTime() + (numberOfDays + weekendOffset) * 86400000));
  return futureDate;
}

function formatDate(date) {
  return date.toString().split(' ').slice(0, 4).join(' ');
}

function createBulletListFromArray(data) {
  const bulletListDelimiter = '\n• ';
  const tasks = bulletListDelimiter.concat(data
    .sort((task1, task2) => {
      return task1.pos - task2.pos;
    })
    .map((task) => { return task.name; })
    .join(bulletListDelimiter));
    return tasks;
  }

  module.exports = {
    respondWithError, dateXdaysFromNow, createBulletListFromArray, formatDate
  };
