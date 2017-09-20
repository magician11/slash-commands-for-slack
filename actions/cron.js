/*
Check for things at an interval.
*/
module.exports = () => {
  const moment = require('moment');
  const sunbowlFirebase = require('../modules/firebase');
  const utils = require('../modules/utils');

  // check review commands executed
  try {
    setInterval(async () => {
      const firebaseData = await sunbowlFirebase.readNode('slash-commands/review');
      if (firebaseData !== null) {
        for (let channel of Object.keys(firebaseData)) {
          const reviewRequested = moment(
            firebaseData[channel].review_requested_at
          );
          if (moment().diff(reviewRequested, 'hours') >= 4) {
            console.log(
              `Sending out reminder email to ${firebaseData[channel]
                .first_name} (${firebaseData[channel].email})...`
            );
            const emailResponse = await utils.sendEmail(
              firebaseData[channel].email,
              'An Action is Required in Slack',
              `<p>Hi ${firebaseData[channel].first_name},</p>
<p>There is a message from Sunbowl waiting for your approval in the <a href="${firebaseData[
                channel
              ].channel_link}">${channel} channel</a> in Slack.
<p>Sunbowl AI</p></p>`
            );
            console.log(emailResponse);
            // remove entry from Firebase as they've been emailed.
            sunbowlFirebase.deleteNode(`slash-commands/review/${channel}`);
          }
        }
      }
    }, 60000);
  } catch (error) {
    console.log(error);
  }
};
