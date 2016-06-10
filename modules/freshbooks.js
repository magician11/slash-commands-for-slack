/* FRESHBOOKS */
const FreshBooks = require('freshbooks');
const SUNBOWL_FRESHBOOKS_API_URL = process.env.SUNBOWL_FRESHBOOKS_URL;
const SUNBOWL_FRESHBOOKS_AUTH_KEY = process.env.SUNBOWL_FRESHBOOKS_API_TOKEN;
const sunbowlFormstack = require('./formstack');

/*
A freshbooks project Id changes per user for the same project name. So we need to do a string search for the project name
and then return the associated project Id
*/
function getFreshbooksProjectIdFromFreshbooks(freshbooksObj, projectName) {
  function findProjectId(projectList, nameOfProject) {
    let foundProjectId = 0;
    projectList.forEach((project) => {
      if (project.name.toLowerCase() === nameOfProject.toLowerCase()) {
        foundProjectId = project.project_id;
      }
    });
    return foundProjectId;
  }

  return new Promise((resolve, reject) => {
    const projects = new freshbooksObj.Project();

    projects.list({ per_page: 100 }, (error, projectList, options) => {
      if (error) {
        reject(`Error: ${error}`);
      } else {
        const projectId = findProjectId(projectList, projectName);
        if (projectId) {
          resolve(projectId);
        } else if (options.pages > 1) {
          const pagesToProcess = [];
          for (let i = 2; i <= options.pages; i++) {
            pagesToProcess.push(new Promise((done) => {
              projects.list({ per_page: 100, page: i }, (err, extraProjectList) => {
                done(findProjectId(extraProjectList, projectName));
              });
            }));
          }

          let foundProjectId = false;
          Promise.all(pagesToProcess).then((projectIds) => {
            projectIds.forEach((projectIdFromExtraPages) => {
              if (projectIdFromExtraPages > 0) {
                resolve(projectIdFromExtraPages);
                foundProjectId = true;
              }
            });
            if (!foundProjectId) {
              reject(`Could not find a project Id in Freshbooks for ${projectName}`);
            }
          });
        }
      }
    });
  });
}

class SunbowlFreshbooks {
  addTimeEntry(userName, projectName, hours, notes) {
    return new Promise((resolve, reject) => {
      let freshbooks;
      let freshbooksDetailsForUser;

      sunbowlFormstack.getUsersFreshbooksDetails(userName)
      .then((usersFreshbooksDetails) => {
        freshbooksDetailsForUser = usersFreshbooksDetails;
        freshbooks = new FreshBooks(freshbooksDetailsForUser.usersAPIurl, freshbooksDetailsForUser.usersAuthKey);
        return getFreshbooksProjectIdFromFreshbooks(freshbooks, projectName);
      })
      .then((projectId) => {
        const timeEntry = new freshbooks.Time_Entry();
        timeEntry.project_id = projectId;
        timeEntry.task_id = freshbooksDetailsForUser.taskId;
        timeEntry.hours = hours;
        timeEntry.notes = notes;
        timeEntry.create((err, time) => {
          if (err) {
            reject(`Error adding time entry: ${err}`);
          } else {
            resolve(time);
          }
        });
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  getProjectBudget(projectId) {
    const freshbooks = new FreshBooks(SUNBOWL_FRESHBOOKS_API_URL, SUNBOWL_FRESHBOOKS_AUTH_KEY);
    return new Promise((resolve, reject) => {
      const projects = new freshbooks.Project();
      projects.get(projectId, (err, project) => {
        if (err) {
          reject('Could not find a project setup for this channel in Freshbooks.');
        } else {
          resolve(parseInt(project.budget, 10));
        }
      });
    });
  }

  getBillableHours(projectId) {
    function sumTimes(times) {
      let billableHours = 0;
      for (const time of times) {
        billableHours += parseFloat(time.hours);
      }

      return billableHours;
    }

    return new Promise((resolve, reject) => {
      const freshbooks = new FreshBooks(SUNBOWL_FRESHBOOKS_API_URL, SUNBOWL_FRESHBOOKS_AUTH_KEY);
      const timeEntries = new freshbooks.Time_Entry();
      let billableHours = 0;
      timeEntries.list({ project_id: projectId, per_page: 100 }, (err, times, options) => {
        if (err) {
          reject(err);
        } else {
          // grab the first page of times
          billableHours = sumTimes(times);

          // if there are more pages to process, get those...
          if (options.pages > 1) {
            const pagesToProcess = [];
            for (let i = 2; i <= options.pages; i++) {
              pagesToProcess.push(new Promise((done) => {
                timeEntries.list({ project_id: projectId, per_page: 100, page: i }, (error, moreTimes) => {
                  const extraHours = sumTimes(moreTimes);

                  done(extraHours);
                });
              }));
            }

            Promise.all(pagesToProcess).then((extraTimes) => {
              billableHours = billableHours + extraTimes.reduce((a, b) => a + b);
              resolve(billableHours);
            });
          } else {
            resolve(billableHours);
          }
        }
      });
    });
  }
}

module.exports = new SunbowlFreshbooks();
