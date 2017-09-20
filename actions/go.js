/*
Assign this cycle for this channel to a dev.
*/
module.exports = async (
  userAssigningCycle,
  timeTakenToAssign,
  userAssignedCycle,
  channelName,
  responseUrl
) => {
  const moment = require("moment");
  const utils = require("../modules/utils");
  const freshbooksSunbowl = require("../modules/freshbooks");
  const formstackSunbowl = require("../modules/formstack");
  const trelloSunbowl = require("../modules/trello");
  const slackSunbowl = require("../modules/slack");
  const sunbowlFirebase = require("../modules/firebase");

  try {
    const trelloCardId = await formstackSunbowl.getTrelloCardId(channelName);
    const trelloListId = await trelloSunbowl.findListId(userAssignedCycle);
    await trelloSunbowl.moveTrelloCard(trelloCardId, trelloListId);
    await trelloSunbowl.setDueDate(trelloCardId);
    const taskListId = await trelloSunbowl.getTaskListId(trelloCardId);
    await trelloSunbowl.moveTaskListToTop(taskListId);
    await trelloSunbowl.renameTasklist(taskListId, userAssignedCycle);
    const tasks = await trelloSunbowl.getTaskListItems(taskListId);
    const freshbooksProjectId = await formstackSunbowl.getFreshbooksProjectId(
      channelName
    );
    const projectBudget = await freshbooksSunbowl.getProjectBudget(
      freshbooksProjectId
    );
    const billableHours = await freshbooksSunbowl.getBillableHours(
      freshbooksProjectId
    );
    const userAssignedCycleFirstName = await slackSunbowl.getFirstname(
      userAssignedCycle.slice(1)
    );
    await freshbooksSunbowl.addTimeEntry(
      userAssigningCycle,
      channelName,
      parseFloat(timeTakenToAssign),
      "Discussions with client about cycle details. Made video for developer, organized cycle and assigned out."
    );

    const timeLeft = projectBudget - billableHours - timeTakenToAssign;

    const goReviewMessage = {
      response_type: "in_channel",
      text: `*${userAssignedCycleFirstName} has been assigned your next cycle.*
Your cycle has been placed in the queue and will be worked on as soon as possible.
Your New Bucket Balance: \`${timeLeft.toFixed(1)} hours\``,
      replace_original: false
    };

    /*
     Log this action of assigning out a task
     And store in Firebase at the location
      logs/user_name/YYYYMMDD/channel_name/

      update the object
      timeAssigned - new moment.valueOf() // https://momentjs.com/docs/#/displaying/unix-timestamp-milliseconds/
     */

    const thisMoment = new moment();

    sunbowlFirebase.updateObject(
      `logs/${userAssigningCycle}/${thisMoment.format("DDMMYYYY")}`,
      channelName,
      { timeAssigned: thisMoment.valueOf() }
    );

    slackSunbowl.postToSlack(goReviewMessage, responseUrl);
  } catch (error) {
    slackSunbowl.postToSlack(utils.constructErrorForSlack(error), responseUrl);
  }
};
