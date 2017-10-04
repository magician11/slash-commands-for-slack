/*
Slash command for Sunbowl
Get all the tasks from this channel's trello card, and present them to a client to review.
Buttons are added for them to confirm this cycle.
*/

const moment = require("moment");
const utils = require("../modules/utils");
const sunbowlFirebase = require("../modules/firebase");
const freshbooksSunbowl = require("../modules/freshbooks");
const formstackSunbowl = require("../modules/formstack");
const trelloSunbowl = require("../modules/trello");
const slackSunbowl = require("../modules/slack");
const config = require("../security/auth.js").get(process.env.NODE_ENV);

module.exports = app => {
  app.post("/review", async (req, res) => {
    const {
      text,
      token,
      channel_name,
      user_name,
      response_url,
      channel_id,
      team_domain
    } = req.body;
    const reviewArguments = text.split(" ");

    // check to see whether this script is being accessed from our slack apps
    if (token !== config.slack.verificationToken) {
      utils.respondWithError("Access denied.", res);
      return;
    } else if (reviewArguments[0] !== "" && reviewArguments.length < 3) {
      utils.respondWithError(
        "Usage: /review [time taken to assign] [dev name] [client name] [optional cc]",
        res
      );
      return;
    }

    res.json({
      text: `Assembling the review now for you ${user_name}. One moment please...`
    });

    const timeTakenToAssign = reviewArguments[0];
    const devName = reviewArguments[1];
    const clientName = reviewArguments[2];
    const ccField =
      reviewArguments.length === 4 ? ` (cc: <${reviewArguments[3]}>)` : "";

    try {
      const trelloCardId = await formstackSunbowl.getTrelloCardId(channel_name);
      const listNameItsOn = await trelloSunbowl.getListNameForCard(
        trelloCardId
      );

      const listTheCardMustBeOn = "Pending to be assigned";

      if (listNameItsOn !== listTheCardMustBeOn) {
        slackSunbowl.postToSlack(
          {
            attachments: [
              {
                title:
                  "Tisk Tisk, cards have to be queued first before you can use the review command.",
                text: "First do `/que start`",
                image_url:
                  "http://res.cloudinary.com/go-for-self/image/upload/v1506330193/horse-cart.jpg",
                footer: `This card needs to be on the "${listTheCardMustBeOn}" list. It's currently on the "${listNameItsOn}" list.`,
                mrkdwn_in: ["text"]
              }
            ]
          },
          response_url
        );
        return;
      }

      const taskListId = await trelloSunbowl.getTaskListId(trelloCardId);
      const taskList = await trelloSunbowl.getTaskListItems(taskListId);

      if (taskList.length === 0) {
        slackSunbowl.postToSlack(
          utils.constructErrorForSlack("No tasks were found."),
          response_url
        );
      } else {
        const freshbooksProjectId = await formstackSunbowl.getFreshbooksProjectId(
          channel_name
        );
        const projectBudget = await freshbooksSunbowl.getProjectBudget(
          freshbooksProjectId
        );
        const billableHours = await freshbooksSunbowl.getBillableHours(
          freshbooksProjectId
        );

        const percentBucketUsed = billableHours / projectBudget * 100;
        const timeLeft = projectBudget - billableHours;

        const reviewResponse = {};

        if (reviewArguments[0] === "") {
          reviewResponse.text = `${utils.createBulletListFromArray(taskList)}`;
        } else {
          reviewResponse.text = `*Tasks awaiting your approval <${clientName}>${ccField}...*${utils.createBulletListFromArray(
            taskList
          )}`;
          reviewResponse.response_type = "in_channel";
          reviewResponse.attachments = [
            {
              color: "#00bfff",
              fields: [
                {
                  title: "Time Taken To Assign",
                  value: `${user_name}: ${timeTakenToAssign}`,
                  short: true
                },
                {
                  title: "Cycle will be assigned to:",
                  value: devName,
                  short: true
                }
              ],
              footer: `*Your currently have ${timeLeft.toFixed(
                1
              )} hours left of your bucket balance.*`
            },
            {
              text: `*Please review the above cycle. Ready to proceed?*`,
              mrkdwn_in: ["text"],
              callback_id: "review_tasks",
              actions: [
                {
                  name: "review",
                  text: "Confirm",
                  type: "button",
                  value: "confirm",
                  style: "primary"
                },
                {
                  name: "review",
                  text: "I have some changes",
                  type: "button",
                  value: "cancel"
                }
              ]
            }
          ];

          // move the card to the pending to be assigned list
          trelloSunbowl.moveTrelloCard(
            trelloCardId,
            "537bc2cec1db170a09078963"
          );

          // set a flag that a review command was made
          const recipient = await slackSunbowl.getUser(clientName.substring(1));
          sunbowlFirebase.writeObject("slash-commands/review", channel_name, {
            real_name: recipient.profile.real_name,
            email: recipient.profile.email,
            review_requested_at: moment().valueOf(),
            channel_link: `https://${team_domain}.slack.com/messages/${channel_id}/`
          });

          /*
           Log this action of assigning out a task
           And store in Firebase at the location
            logs/user_name/YYYYMMDD/channel_name/

            update the object
            timeAssigned - new moment.valueOf() // https://momentjs.com/docs/#/displaying/unix-timestamp-milliseconds/
           */

          const thisMoment = new moment();

          sunbowlFirebase.updateObject(
            `logs/${user_name}/${thisMoment.format("DDMMYYYY")}`,
            channel_name,
            { timeAssigned: thisMoment.valueOf() }
          );
        }
        slackSunbowl.postToSlack(reviewResponse, response_url);
      }
    } catch (error) {
      slackSunbowl.postToSlack(
        utils.constructErrorForSlack(error),
        response_url
      );
    }
  });
};
