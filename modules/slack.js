const SLACK_TOKEN = process.env.SUNBOWL_SLACK_TOKEN;
const request = require('request');

class SunbowlSlack {

  getFirstname(userName) {
    return new Promise((resolve, reject) => {
      request.get(
        {
          url: `https://slack.com/api/users.list?token=${SLACK_TOKEN}`,
          json: true,
        },
        (error, response, data) => {
          if (error) { reject(error); }
          for (const user of data.members) {
            if (userName === user.name) {
              resolve(user.profile.first_name);
              return;
            }
          }
          reject(`Could not find real name for ${userName}.`);
        });
    });
  }

  postToSlack(message, url) {
    const options = {
      uri: url,
      json: message
    };

    request.post(options);
  }

  postJobReport(jobReportData) {
    const dataToSendToSlack = jobReportData;
    dataToSendToSlack.channel = '#jobreports';
    dataToSendToSlack.response_type = 'in_channel';
    dataToSendToSlack.token = SLACK_TOKEN;
    dataToSendToSlack.username = 'From a Sunbowl dev';
    dataToSendToSlack.icon_emoji = ':desktop_computer:';

    const options = {
      url: 'https://slack.com/api/chat.postMessage',
      form: dataToSendToSlack
    };

    request.post(options);
  }
}

module.exports = new SunbowlSlack();