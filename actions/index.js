/*
Process incoming interactions from the slack channel, like buttons
*/
const moment = require("moment");
const assignCycle = require("./go");
const sunbowlFirebase = require("../modules/firebase");
const utils = require("../modules/utils");
const formstackSunbowl = require("../modules/formstack");
const slackSunbowl = require("../modules/slack");
const trelloSunbowl = require("../modules/trello");

module.exports = app => {
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post("/action", async (req, res) => {
    const slackMessage = JSON.parse(req.body.payload);

    // check to see whether this script is being accessed from our slack apps
    if (
      slackMessage.token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      slackMessage.token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError("Access denied.", res);
      return;
    }

    console.log(JSON.stringify(slackMessage, null, 2));

    switch (slackMessage.callback_id) {
      // on a client confirming a cycle or not
      case "review_tasks": {
        const actionCycle = slackMessage.actions[0].value === "confirm";
        res.json({
          text: slackMessage.original_message.text,
          attachments: [
            slackMessage.original_message.attachments[0],
            {
              text: actionCycle
                ? "Ok, great. We will action this cycle now for you."
                : "Ok, no prob. Let us know what you want changed.",
              color: actionCycle ? "good" : "warning"
            }
          ]
        });

        if (actionCycle) {
          // split something like 'nic: 0.3'
          const assignedOutDetails = slackMessage.original_message.attachments[0].fields[0].value.split(
            ": "
          );
          assignCycle(
            assignedOutDetails[0],
            assignedOutDetails[1],
            slackMessage.original_message.attachments[0].fields[1].value,
            slackMessage.channel.name,
            slackMessage.response_url
          );
        }
        // remove entry from Firebase as they're responded.
        sunbowlFirebase.deleteNode(
          `slash-commands/review/${slackMessage.channel.name}`
        );

        break;
      }
      // in response to a user forcing a card to the "Pending to be assigned" list from the /que command
      case "force_queue": {
        const actionQueue = slackMessage.actions[0].value === "confirm";
        // give an initial response based on which button pressed
        res.json({
          text: actionQueue
            ? "Ok we will will move this card for you now."
            : "No prob. Leaving the card as is."
        });

        // if we are to action queueing this card, do a few things...
        if (actionQueue) {
          const trelloCardId = await formstackSunbowl.getTrelloCardId(
            slackMessage.channel.name
          );

          // find the user ID for the dev this card was assigned to
          const devName = await trelloSunbowl.getListNameForCard(trelloCardId);
          console.log(devName);
          const dev = await slackSunbowl.getUser(devName.substring(1));

          console.log(dev);

          // move the card
          await trelloSunbowl.moveTrelloCard(
            trelloCardId,
            slackSunbowl.pendingToBeAssignedListId
          );

          // log the queueing
          const thisMoment = new moment();

          sunbowlFirebase.writeObject(
            `logs/${slackMessage.user.name}/${thisMoment.format("DDMMYYYY")}`,
            slackMessage.channel.name,
            { timeWhenQueued: thisMoment.valueOf() }
          );

          // notify the dev that this card was on
          const response = await slackSunbowl.sendDM(
            dev.id,
            `Hi ${dev.profile.display_name}! <@${slackMessage.user.id}> has moved the *${slackMessage
              .channel
              .name}* card to the Pending to be assigned list. It will most likely be re-assigned to you shortly.`
          );

          console.log(response);

          // slackSunbowl.postToSlack(
          //   {
          //     text: `The ${slackMessage.channel.name} card has been moved to the Pending To Be Assigned list.`
          //   },
          //   response_url
          // );
        }

        break;
      }
      default: {
        utils.respondWithError("This interaction is not known.", res);
      }
    }
  });
};
