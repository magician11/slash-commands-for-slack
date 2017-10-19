/*
Slash command for Sunbowl
Notify someone that a sprint for a channel is complete
*/

const utils = require("../modules/utils");
const trelloSunbowl = require("../modules/trello");
const freshbooksSunbowl = require("../modules/freshbooks");
const formstackSunbowl = require("../modules/formstack");
const slackSunbowl = require("../modules/slack");
const firebaseSunbowl = require("../modules/firebase");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

module.exports = app => {
  app.post("/jobreport", async (req, res) => {
    const {
      token,
      user_name,
      text,
      channel_name,
      channel_id,
      response_url
    } = req.body;

    const jobreportArguments = text.split(" ");

    // check to see whether this script is being accessed from our slack apps
    if (token !== config.slack.verificationToken) {
      utils.respondWithError("Access denied.", res);
      return;
    } else if (jobreportArguments.length !== 2) {
      utils.respondWithError("Usage: /jobreport [time taken] [video url]", res);
      return;
    }

    res.json({
      text: `Thanks <@${user_name}>. Your job report has been submitted.`
    });

    try {
      const timeTaken = jobreportArguments[0];
      const videoUrl = jobreportArguments[1];

      await freshbooksSunbowl.addTimeEntry(
        user_name,
        channel_name,
        parseFloat(timeTaken),
        videoUrl
      );
      const trelloCardId = await formstackSunbowl.getTrelloCardId(channel_name);
      await trelloSunbowl.moveTrelloCard(
        trelloCardId,
        trelloSunbowl.finishedBlockListId
      );

      // send a message to the jobreports channel to show the job report
      await slackSunbowl.postToChannelFromBot(
        "jobreports",
        `Hi team,
<@${user_name}> just finished a sprint for ${channel_name}
Time it took: \`${timeTaken} hrs\`
Video review: ${videoUrl}
Trello card: https://trello.com/c/${trelloCardId}`
      );
      // notify the users in the channel that a job report has been submitted
      await slackSunbowl.postToSlack(
        {
          text:
            "A job report has been submitted and your project is now in the review stage. We will update you as soon as possible when we are ready for your feedback.",
          response_type: "in_channel"
        },
        response_url
      );

      // notify project manager that the job report has been posted
      // grab details from when job was assigned out
      const assignedOutDetails = await firebaseSunbowl.readNode(
        `/cycles/${channel_name}`
      );
      slackSunbowl.sendDM(
        assignedOutDetails.projectManager.id,
        `Hey ${assignedOutDetails.projectManager
          .name}. ${user_name} just submitted a job report. Check it out in the jobreports channel.`
      );
    } catch (err) {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(err), response_url);
    }
  });
};
