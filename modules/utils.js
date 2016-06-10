'use strict';

/*
utility functions
*/

class SunbowlUtils {

  respondWithError(err, res) {
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
  dateXdaysFromNow(numberOfDays) {
    const rightNow = new Date();

    // if the due date (2 days from now) falls on the weekend, shift that due date to Monday
    let weekendOffset;
    switch (rightNow.getDay()) {
      case 4: weekendOffset = 3; break; // Thursday
      case 5: weekendOffset = 2; break; // Friday
      default: weekendOffset = 0;
    }

    const futureDate = new Date(rightNow.setTime(rightNow.getTime() + (numberOfDays + weekendOffset) * 86400000));
    return futureDate;
  }

  formatDate(date) {
    return date.toString().split(' ').slice(0, 4).join(' ');
  }

  shortenUrl(urlToShorten) {
    return new Promise((resolve, reject) => {
      const request = require('request');
      const GOOGLE_API_KEY = process.env.SUNBOWL_DEVELOPER_API_KEY;
      const shortenerUrl = `https://www.googleapis.com/urlshortener/v1/url?key=${GOOGLE_API_KEY}`;

      const options = {
        uri: shortenerUrl,
        json: {
          longUrl: urlToShorten
        }
      };

      request.post(options, (error, response, body) => {
        if (body.error) {
          reject(body.error.errors[0].reason);
        } else if (response.statusCode === 200) {
          resolve(body.id);
        }
      });
    });
  }

  createBulletListFromArray(data) {
    const bulletListDelimiter = '\n• ';
    const tasks = bulletListDelimiter.concat(data
      .sort((task1, task2) =>
      task1.pos - task2.pos
    )
    .map((task) => task.name)
    .join(bulletListDelimiter));
    return tasks;
  }

}

module.exports = new SunbowlUtils();
