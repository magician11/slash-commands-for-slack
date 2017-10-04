/* utility functions */
const nodemailer = require('nodemailer');
const config = require("../security/auth.js").get(process.env.NODE_ENV);

class SunbowlUtils {
  constructErrorForSlack(err) {
    const error = {
      text: 'Whoops... looks like there was a problem.',
      attachments: [
        {
          color: 'danger',
          text: err.toString(),
          mrkdwn_in: ['text']
        }
      ]
    };

    return error;
  }

  sendEmail(to, subject, html) {
    return new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: config.google.emailAddress,
          pass: config.google.password
        }
      });

      const mailOptions = { from: config.google.emailAddress, to, subject, html };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(`Message sent: ${info.response}`);
        }
      });
    });
  }

  respondWithError(err, res) {
    res.json(this.constructErrorForSlack(err));
  }

  // returns a string date in the format e.g. Sat Apr 09 2016
  dateXdaysFromNow(numberOfDays) {
    const rightNow = new Date();

    // if the due date (2 days from now) falls on the weekend, shift that due date to Monday
    let weekendOffset;
    switch (rightNow.getDay()) {
      case 4:
        weekendOffset = 3;
        break; // Thursday
      case 5:
        weekendOffset = 2;
        break; // Friday
      default:
        weekendOffset = 0;
    }

    const futureDate = new Date(
      rightNow.setTime(
        rightNow.getTime() + (numberOfDays + weekendOffset) * 86400000
      )
    );
    return futureDate;
  }

  formatDate(date) {
    return date.toString().split(' ').slice(0, 4).join(' ');
  }

  shortenUrl(urlToShorten) {
    return new Promise((resolve, reject) => {
      const request = require('request');
      const shortenerUrl = `https://www.googleapis.com/urlshortener/v1/url?key=${config.google.apiKey}`;

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
    const tasks = bulletListDelimiter.concat(
      data
        .sort((task1, task2) => task1.pos - task2.pos)
        .map(task => task.name)
        .join(bulletListDelimiter)
    );
    return tasks;
  }
}

module.exports = new SunbowlUtils();
