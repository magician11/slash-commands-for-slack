/*
Assign this cycle for this channel to a dev.
*/
module.exports = async (
  timeTakenToAssign,
  assignee,
  userName,
  channelName,
  responseUrl
) => {
  const utils = require('../modules/utils');
  const freshbooksSunbowl = require('../modules/freshbooks');
  const formstackSunbowl = require('../modules/formstack');
  const trelloSunbowl = require('../modules/trello');
  const slackSunbowl = require('../modules/slack');

  try {
    const trelloCardId = await formstackSunbowl.getTrelloCardId(channelName);
    console.log('trelloCardId', trelloCardId);
    const trelloListId = await trelloSunbowl.findListId(assignee);
    console.log('trelloListId', trelloListId);
    await trelloSunbowl.moveTrelloCard(trelloCardId, trelloListId);
    await trelloSunbowl.setDueDate(trelloCardId);
    const taskListId = await trelloSunbowl.getTaskListId(trelloCardId);
    console.log('taskListId', taskListId);
    await trelloSunbowl.moveTaskListToTop(taskListId);
    await trelloSunbowl.renameTasklist(taskListId, assignee);
    const tasks = await trelloSunbowl.getTaskListItems(taskListId);
    console.log('tasks', tasks);
    const freshbooksProjectId = await formstackSunbowl.getFreshbooksProjectId(
      channelName
    );
    console.log('freshbooksProjectId', freshbooksProjectId);
    const projectBudget = await freshbooksSunbowl.getProjectBudget(
      freshbooksProjectId
    );
    console.log('projectBudget', projectBudget);
    const billableHours = await freshbooksSunbowl.getBillableHours(
      freshbooksProjectId
    );
    console.log('billableHours', billableHours);
    const assigneeFirstName = await slackSunbowl.getFirstname(
      assignee.slice(1)
    );
    console.log('assigneeFirstName', assigneeFirstName);
    await freshbooksSunbowl.addTimeEntry(
      userName,
      channelName,
      parseFloat(timeTakenToAssign),
      'Discussions with client about cycle details. Made video for developer, organized cycle and assigned out.'
    );

    const timeLeft = projectBudget - billableHours - timeTakenToAssign;

    const goReviewMessage = {
      response_type: 'in_channel',
      text: `*${assigneeFirstName} has been assigned your next cycle.*
Your cycle has been placed in the queue and will be worked on as soon as possible.
Your New Bucket Balance: \`${timeLeft.toFixed(1)} hours\``,
      replace_original: false
    };

    slackSunbowl.postToSlack(goReviewMessage, responseUrl);
  } catch (error) {
    slackSunbowl.postToSlack(utils.constructErrorForSlack(error), responseUrl);
  }
};
