const request = require("request");
const rpn = require("request-promise-native");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

class SunbowlSlack {
  // Sends a direct message to a specific user from our bot
  sendDM(userId, message) {
    return new Promise(async (resolve, reject) => {
      try {
        const conversationRes = await rpn({
          uri: `https://slack.com/api/conversations.open?token=${config.slack
            .botUserOauthAccesstoken}&users=${userId}`,
          json: true
        });

        const messageOptions = {
          uri: "https://slack.com/api/chat.postMessage",
          form: {
            token: config.slack.botUserOauthAccesstoken,
            channel: conversationRes.channel.id,
            text: message
          }
        };

        const messageRes = await rpn.post(messageOptions);

        resolve(messageRes);
      } catch (error) {
        reject(`Error sending a DM: ${error}`);
      }
    });
  }

  // Sends a direct message to a specific channel from our bot
  postToChannelFromBot(channelId, message) {
    return new Promise(async (resolve, reject) => {
      try {
        const messageOptions = {
          uri: "https://slack.com/api/chat.postMessage",
          form: {
            token: config.slack.botUserOauthAccesstoken,
            channel: channelId,
            text: message
          }
        };

        const messageRes = await rpn.post(messageOptions);

        resolve(messageRes);
      } catch (error) {
        reject(`Error sending a DM to the channel: ${error}`);
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

  // get channelId
  getChannelId(channelName) {
    return new Promise(async (resolve, reject) => {
      try {
        const channelList = await rpn({
          uri: `https://slack.com/api/channels.list?token=${config.slack
            .oauthAccesstoken}`,
          json: true
        });

        for (const channel of channelList.channels) {
          if (channelName === channel.name) {
            resolve(channel.id);
            return;
          }
        }
        reject(`We could not find ${channelName} in the list of channels.`);
      } catch (error) {
        reject(`Error with finding the channelId for ${channelName}: ${error}`);
      }
    });
  }

  // given a message, send it back to the response URL
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
}

module.exports = new SunbowlSlack();
