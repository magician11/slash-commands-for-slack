const request = require("request");
const rpn = require("request-promise-native");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

class SunbowlSlack {
  constructor() {
    this.pendingToBeAssignedListId = "537bc2cec1db170a09078963";
  }

  // Sends a direct message to a specific user from the BOT
  sendDM(userId, message) {
    return new Promise(async (resolve, reject) => {
      try {
        const conversationRes = await rpn({
          uri: `https://slack.com/api/conversations.open?token=${config.slack
            .botUserOauthAccesstoken}&users=${userId}`,
          json: true
        });

        const messageRes = await rpn({
          uri: `https://slack.com/api/chat.postMessage?token=${config.slack
            .botUserOauthAccesstoken}&channel=${conversationRes.channel
            .id}&text=${message}`,
          json: true
        });

        resolve(messageRes);
      } catch (error) {
        reject(`Error sending a DM: ${error}`);
      }
    });
  }

  // get the real name of a user
  getName(userName) {
    return new Promise((resolve, reject) => {
      request.get(
        {
          url: `https://slack.com/api/users.list?token=${config.slack
            .oauthAccesstoken}`,
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

  // argument of user without @, and return the full user object (including id and profile child object)
  getUser(userName) {
    return new Promise(async (resolve, reject) => {
      try {
        const userList = await rpn({
          uri: `https://slack.com/api/users.list?token=${config.slack
            .oauthAccesstoken}`,
          json: true
        });

        for (const user of userList.members) {
          if (userName === user.name) {
            resolve(user);
            return;
          }
        }
        reject(`We could not find a profile for ${userName}.`);
      } catch (error) {
        reject(`Error with finding the profile for ${userName}: ${error}`);
      }
    });
  }

  postToSlack(message, url) {
    return new Promise(async (resolve, reject) => {
      try {
        const postResponse = await rpn.post({
          uri: url,
          body: message,
          json: true
        });

        resolve(postResponse);
      } catch (error) {
        reject(`Error posting to Slack: ${error}`);
      }
    });
  }

  postJobReport(jobReportData) {
    const dataToSendToSlack = jobReportData;
    dataToSendToSlack.channel = "#jobreports";
    dataToSendToSlack.response_type = "in_channel";
    dataToSendToSlack.token = config.slack.oauthAccesstoken;
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
