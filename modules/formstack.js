/* FORMSTACK */
const request = require('request');

function constructEndpointUrl(formId, searchFieldId, searchFieldValue) {
  const FORMSTACK_TOKEN = process.env.SUNBOWL_FORMSTACK_TOKEN;
  const FORMSTACK_BASE_URL = 'https://www.formstack.com/api/v2/form';
  return `${FORMSTACK_BASE_URL}/${formId}/submission.json?data=true&oauth_token=${FORMSTACK_TOKEN}&search_field_0=${searchFieldId}&search_value_0=${searchFieldValue}`;
}

// generic function to fetch data from a Formstack form
function getDataFromSlackForm(channelName, fieldId) {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url: constructEndpointUrl(2198788, 38710905, channelName),
        json: true
      },
      (error, response, data) => {
        data.submissions.forEach((submission) => {
          if (submission.data[38710905].value === channelName) {
            if (submission.data[fieldId]) {
              resolve(submission.data[fieldId].value);
            }
          }
        });
        reject(`Could not find the option with ID ${fieldId} for channel ${channelName}.`);
      });
  });
}

class SunbowlFormstack {
  getRefillOption(channelName) {
    return getDataFromSlackForm(channelName, 42868490);
  }

  getTrelloCardId(channelName) {
    return getDataFromSlackForm(channelName, 40296108);
  }

  getFreshbooksProjectId(channelName) {
    return getDataFromSlackForm(channelName, 38710988);
  }

  getUsersFreshbooksDetails(userName) {
    return new Promise((resolve, reject) => {
      request.get({
        url: constructEndpointUrl(2350444, 41935293, userName),
        json: true },
        (error, response, data) => {
          if (error) {
            reject(error);
          } else {
            data.submissions.forEach((submission) => {
              if (submission.data[41935293].value === userName) {
                resolve({
                  usersAPIurl: submission.data[42242492].value,
                  usersAuthKey: submission.data[41935324].value,
                  taskId: submission.data[42242488].value
                });
              }
            });
            reject(`Could not find an entry for the user ${userName}.`);
          }
        });
    });
  }
}

module.exports = new SunbowlFormstack();
