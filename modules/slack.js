const SLACK_TOKEN = process.env.SUNBOWL_SLACK_TOKEN;
const BOT_USER_OAUTH_ACCESS_TOKEN = process.env.SUNBOWL_BOT_USER_OAUTH_ACCESS_TOKEN;
const request = require("request");
const rpn = require("request-promise-native");

class SunbowlSlack {
  constructor() {
    this.pendingToBeAssignedListId = "537bc2cec1db170a09078963";
  }

/*
Sends a direct message to a specific user from the BOT
*/
  sendDM(userId, message) {
    return new Promise(async (resolve, reject) => {
      try {
        const conversationRes = await rpn({
          uri: `https://slack.com/api/conversations.open?token=${BOT_USER_OAUTH_ACCESS_TOKEN}&users=${userId}`,
          json: true
        });

        const messageRes = await rpn({
          uri: `https://slack.com/api/chat.postMessage?token=${BOT_USER_OAUTH_ACCESS_TOKEN}&channel=${conversationRes.channel.id}&text=${message}`,
          json: true
        });

        resolve(messageRes);
      } catch (error) {
        reject(`Error sending a DM: ${error}`);
      }
    });
  }

  getName(userName) {
    return new Promise((resolve, reject) => {
      request.get(
        {
          url: `https://slack.com/api/users.list?token=${SLACK_TOKEN}`,
          json: true
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          for (const user of data.members) {
            if (userName === user.name) {
              resolve(user.profile.real_name);
              return;
            }
          }
          reject(`Could not find real name for ${userName}.`);
        }
      );
    });
  }

  // argument of user without @
  getUserProfile(userName) {
    return new Promise(async (resolve, reject) => {
      try {
        const userList = await rpn({
          uri: `https://slack.com/api/users.list?token=${SLACK_TOKEN}`,
          json: true
        });
        for (const user of userList.members) {
          if (userName === user.name) {
            resolve(user.profile);
            return;
          }
        }
        reject(`Could not find a profile for ${userName}.`);
      } catch (error) {
        reject(`Error with finding the profile for ${userName}: ${error}`);
      }
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
    dataToSendToSlack.channel = "#jobreports";
    dataToSendToSlack.response_type = "in_channel";
    dataToSendToSlack.token = SLACK_TOKEN;
    dataToSendToSlack.username = "From a Sunbowl dev";
    dataToSendToSlack.icon_emoji = ":desktop_computer:";

    const options = {
      url: "https://slack.com/api/chat.postMessage",
      form: dataToSendToSlack
    };

    request.post(options);
  }
}

module.exports = new SunbowlSlack();
