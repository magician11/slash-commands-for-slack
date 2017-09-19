/*
Slash command for Sunbowl
Get an overview of various jobs
*/

module.exports = app => {
  const moment = require("moment");
  const utils = require("../modules/utils");
  const trelloSunbowl = require("../modules/trello");
  const sunbowlFirebase = require("../modules/firebase");
  const formstackSunbowl = require("../modules/formstack");
  const slackSunbowl = require("../modules/slack");
  const SUNBOWL_AI_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_VERIFICATION_TOKEN;
  const SUNBOWL_AI_DEV_VERIFICATION_TOKEN =
    process.env.SUNBOWL_AI_DEV_VERIFICATION_TOKEN;

  app.post("/que", async (req, res) => {
    const { token, text, user_name, response_url, channel_name } = req.body;
    const queParameters = text.split(" ");

    // check to see whether this script is being accessed from our slack apps
    if (
      token !== SUNBOWL_AI_DEV_VERIFICATION_TOKEN &&
      token !== SUNBOWL_AI_VERIFICATION_TOKEN
    ) {
      utils.respondWithError("Access denied.", res);
      return;
    }

    res.json({ text: `Let me look into this for you ${user_name}...` });

    try {
      const pendingToBeAssignedListId = "537bc2cec1db170a09078963";

      // if there is no argument, then show the projects in the pending to be assigned list
      if (queParameters[0] === "") {
        const pendingProjectsNames = await trelloSunbowl.getCardNamesFromList(
          pendingToBeAssignedListId
        );
        const pendingProjects = {
          text: `Pending to be assigned projects`,
          attachments: pendingProjectsNames.map(projectTitle => {
            return { text: projectTitle };
          })
        };

        slackSunbowl.postToSlack(pendingProjects, response_url);

        // else if the dev argument is used
      } else if (queParameters[0] === "dev") {
        // if a dev name is also added, return the list of projects that dev is working on
        if (queParameters[1]) {
          const developerWorkload = await trelloSunbowl.getDeveloperWorkload(
            queParameters[1]
          );

          const developerSummary = {
            text: `Current projects for ${queParameters[1]}`,
            attachments: developerWorkload.map(projectTitle => {
              return { text: projectTitle };
            })
          };
          slackSunbowl.postToSlack(developerSummary, response_url);

          // otherwise show a summary of all devs (number of cards per dev)
        } else {
          const developerWorkloads = await trelloSunbowl.getDeveloperWorkloads();
          const developersSummary = {
            text: "Current developer workload.",
            attachments: developerWorkloads.map(developer => {
              return { text: `${developer.name}: ${developer.numberOfCards}` };
            })
          };
          slackSunbowl.postToSlack(developersSummary, response_url);
        }

        // else if the argument start is specified, then move this channel's card to the pending to be assigned list
      } else if (queParameters[0] === "start") {
        // find the id of the card associated with this channel
        const trelloCardId = await formstackSunbowl.getTrelloCardId(
          channel_name
        );

        // find the list the card is currently on
        const listName = await trelloSunbowl.getListNameForCard(trelloCardId);
        if (listName.startsWith("@"))
          throw `The ${channel_name} card is currently being worked on by ${listName}. So leaving it.`;

        await trelloSunbowl.moveTrelloCard(
          trelloCardId,
          pendingToBeAssignedListId
        );
        slackSunbowl.postToSlack(
          {
            text: `The ${channel_name} card has been moved to the Pending To Be Assigned list.`
          },
          response_url
        );

        /*
         Log this action of moving a card to the pending to be assigned list.
         And store in Firebase at the location
          logs/user_name/YYYYMMDD/channel_name/

          with the object
          startTime - new moment.valueOf() // https://momentjs.com/docs/#/displaying/unix-timestamp-milliseconds/
         */

        const thisMoment = new moment();

        sunbowlFirebase.updateObject(
          `logs/${user_name}/${thisMoment.format("DDMMYYYY")}`,
          channel_name,
          { timeWhenQueued: thisMoment.valueOf() }
        );
      } else if (queParameters[0] === "report") {
        if (!queParameters[1]) {
          throw "You need to specify a date in the format DDMMYYY. e.g. /que report 19092017";
        } else {
          const dateToQuery = new moment(queParameters[1], "DDMMYYYY");
          if (!dateToQuery.isValid()) {
            throw `Invalid date ${queParameters[1]}. It needs to be in the format DDMMYYYY. e.g. /que report 19092017`;
          } else {
            const cyclesAssignedOut = await sunbowlFirebase.readNode(
              `logs/${user_name}/${queParameters[1]}`
            );
            if (cyclesAssignedOut === null) {
              slackSunbowl.postToSlack(
                {
                  text: `No cycles were queued or assigned out from you ${user_name} on ${dateToQuery.format(
                    "Do MMM YYYY"
                  )}`
                },
                response_url
              );
            } else {
              const cyclesReport = {
                text: `Cycles assigned out today (${dateToQuery.format(
                  "Do MMMM YYYY"
                )})`,
                attachments: []
              };
              for (const [key, value] of Object.entries(cyclesAssignedOut)) {
                const timeWhenQueued = new moment(value.timeWhenQueued);
                const timeAssigned = new moment(value.timeAssigned);

                const timeTakenToAssign = moment
                  .duration(timeAssigned.diff(timeWhenQueued))
                  .humanize();

                cyclesReport.attachments.push({
                  title: key,
                  text: `Time taken to assign out: ${timeTakenToAssign}`,
                  fields: [
                    {
                      title: "Time queued at",
                      value: timeWhenQueued.format("LTS"),
                      short: true
                    },
                    {
                      title: "Time assigned at",
                      value: timeAssigned.format("LTS"),
                      short: true
                    }
                  ]
                });
              }
              slackSunbowl.postToSlack(cyclesReport, response_url);
            }
          }
        }
      }
    } catch (err) {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(err), response_url);
    }
  });
};
