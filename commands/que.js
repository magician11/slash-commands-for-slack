/*
Slash command for Sunbowl
Get an overview of various jobs
*/

module.exports = app => {
  const utils = require("../modules/utils");
  const trelloSunbowl = require("../modules/trello");
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

    res.json(`Let me look into this for you ${user_name}...`);

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
        // but check that this is a channel and not a user so that it has a valid channel.
        const trelloCardId = await formstackSunbowl.getTrelloCardId(
          channel_name
        );
        await trelloSunbowl.moveTrelloCard(
          trelloCardId,
          pendingToBeAssignedListId
        );
        slackSunbowl.postToSlack(
          {
            text: `${channel_name} card moved to the Pending To Be Assigned list.`
          },
          response_url
        );
      }
    } catch (err) {
      slackSunbowl.postToSlack(utils.constructErrorForSlack(err), response_url);
    }
  });
};
