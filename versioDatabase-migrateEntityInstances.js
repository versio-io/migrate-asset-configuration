// User input
const CONFIG = {
  "name": "",
  "description": "",
  "migrateFrom": {
    "entity": "application",
    "serverURL": "https://live.versio.io",
    "apiToken": "",
    "environment": "e2wqx5t27q",
  },
  "migrateTo": {
    "entity": "application-test",
    "serverURL": "https://live.versio.io",
    "apiToken": "",
    "environment": "devtest",
  },
};

const VERSIO_API_VERSION = "/api-versio.db/1.0/";
const PAGE_SIZE = 100;

// Require used modules.
const axios = require("axios");

// create from and to axios instances
const axiosFrom = axios.create({
  baseURL: `${CONFIG.migrateFrom.serverURL}${VERSIO_API_VERSION}`,
  headers: {
    "Authorization": `apiToken ${CONFIG.migrateFrom.apiToken}`,
    "Content-Type": "application/json",
  },
});

const axiosTo = axios.create({
  baseURL: `${CONFIG.migrateTo.serverURL}${VERSIO_API_VERSION}`,
  headers: {
    "Authorization": `apiToken ${CONFIG.migrateTo.apiToken}`,
    "Content-Type": "application/json",
  },
});

function getEntityFromVersio() {
  // Move instance of given entity to another environment or entity
  // GET instance IDs
  console.log(
    "GET all instance IDs of the given entity '" +
      CONFIG.migrateFrom.entity +
      "'."
  );
  let offsetIds = 0;
  // With large results, multiple GET requests are required to get all instances
  do {
    let entityUrlIds =
      config.migrateFrom.serverURL +
      apiVersion +
      config.migrateFrom.environment +
      "/" +
      config.migrateFrom.entity +
      "?limit=" +
      limit +
      "&offset=" +
      offsetIds;

    let options = {
      method: "GET",
      uri: entityUrlIds,
      headers: {
        "Authorization": "apiToken " + CONFIG.migrateFrom.apiToken,
      },
    };

    return request(options)
      .then(async (sourceResponse) => {
        let sourceResponseBody = JSON.parse(sourceResponse);
        if (sourceResponseBody.totalAvailableItems > offsetIds + limit) {
          offsetIds += limit;
        } else {
          offsetIds = false;
        }
        let instances = sourceResponseBody.items;

        console.log("Found " + instances.length + " instance IDs. ");

        await instances
          .reduce((promiseChain, instance) => {
            return promiseChain.then(async () => {
              console.log("     GET change information for every instance. ");

              let offsetInstances = 0;
              // GET all changes of one instance
              // With large results, multiple GET requests are required to get all changes
              do {
                let entityUrlInstances =
                  CONFIG.migrateFrom.serverURL +
                  apiVersion +
                  CONFIG.migrateFrom.environment +
                  "/" +
                  CONFIG.migrateFrom.entity +
                  "/" +
                  instance +
                  "?content=changes&limit=" +
                  limit +
                  "&offset=" +
                  offsetInstances +
                  "&utcStart=0000000000000&utcEnd=9999999999999&sortTime=asc";

                options = {
                  method: "GET",
                  uri: entityUrlInstances,
                  headers: {
                    "Authorization": "apiToken " + CONFIG.migrateFrom.apiToken,
                  },
                };

                return request(options)
                  .then(async (sourceResponse) => {
                    let changeResponseBody = JSON.parse(sourceResponse);
                    if (
                      changeResponseBody.totalAvailableItems >
                      offsetInstances + limit
                    ) {
                      offsetInstances += limit;
                    } else {
                      offsetInstances = false;
                    }
                    let changes = changeResponseBody.items.map((item) => item);

                    console.log(
                      "     Import instances with their change information to Versio.io. "
                    );

                    await changes
                      .reduce((promiseChain2, change) => {
                        return promiseChain2.then(async () => {
                          // Status of instance: created or updated
                          if (change.type !== 2) {
                            let entityUrl =
                              CONFIG.migrateTo.serverURL +
                              apiVersion +
                              CONFIG.migrateTo.environment +
                              "/" +
                              CONFIG.migrateTo.entity +
                              "/" +
                              change.instance +
                              "?utc=" +
                              change.utc;

                            options = {
                              method: "PUT",
                              uri: entityUrl,
                              headers: {
                                "Authorization":
                                  "apiToken " + CONFIG.migrateTo.apiToken,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(change.state),
                            };

                            // Import instances to Versio.io
                            return request(options)
                              .then(async (sourceResponse) => {
                                console.log(
                                  "           Import of change for instance '" +
                                    change.instance +
                                    "' at timestamp " +
                                    change.utc +
                                    " finished. "
                                );
                              })
                              .catch((error) => {
                                console.log(
                                  "           Could not create change in Versio.io. " +
                                    error
                                );
                              });
                          }
                          // Status of instance: deleted
                          else {
                            // IMPLEMENT DELETE HERE
                            // entityUrl = CONFIG.migrateTo.serverURL + apiVersion + CONFIG.migrateTo.environment + "/" + CONFIG.migrateTo.entity + "/" + change.instance + "?utc=" + change.utc;
                            // options = {
                            //   method: "DELETE",
                            //   uri: entityUrl,
                            //   "Authorization": "apiToken " + CONFIG.migrateFrom.apiToken,
                            //   "Content-Type": "application/json"
                            //   body: JSON.stringify(change.state)
                            // };
                            // return (
                            //   request(options)
                            //     .then(async sourceResponse => {
                            //       console.log("Import of change to Versio successful. ");
                            //     })
                            //     .catch(error => {
                            //       console.log("Could not create change in Versio.io. " + error);
                            //     })
                            // );
                          }
                        });
                      }, Promise.resolve([]))
                      .then(() => {});
                  })
                  .catch((error) => {
                    console.log(
                      "     Could not get specific instance from Versio.io.  " +
                        error
                    );
                  });
              } while (offsetInstances);
            });
          }, Promise.resolve([]))
          .then(() => {});
      })
      .catch((error) => {
        console.log(
          "Could not get instances from requested entity from Versio.io. " +
            error
        );
      });
  } while (offsetIds);
}

const main = async () => {
  console.log(
    `Start migrating entity changes:\n\tENVIRONMENT: ${CONFIG.migrateFrom.environment} -> ${CONFIG.migrateTo.environment}\n\tENTITY: ${CONFIG.migrateFrom.entity} -> ${CONFIG.migrateTo.entity}`
  );

  let offset = 0;
  let totalAvailableItems = 0;
  let pageCount = 1;
  let errorsOccurred = false;

  do {
    console.log(
      `Get page ${pageCount} (OFFSET ${offset} | LIMIT ${PAGE_SIZE}).`
    );
    const pageResults = await axiosFrom({
      method: "get",
      url: `${CONFIG.migrateFrom.environment}`,
      params: {
        content: "changes",
        utcStart: 0,
        utcEnd: 9999999999999,
        sortTime: "asc",
        entityFilter: CONFIG.migrateFrom.entity,
        limit: PAGE_SIZE,
        offset,
      },
    });

    console.log(
      `\tGot changes ${offset + 1}-${
        offset + pageResults.data.items.length
      } from ${pageResults.data.totalAvailableItems}.`
    );

    totalAvailableItems = pageResults.data.totalAvailableItems;
    offset = offset + PAGE_SIZE;
    pageCount++;

    console.log(`Saving changes.`);
    const saveResult = await axiosTo({
      method: "put",
      url: `environments/${CONFIG.migrateTo.environment}/instances`,
      data: pageResults.data.items.map((change) => ({
        entity: CONFIG.migrateTo.entity,
        id: change.instance,
        state: change.state,
        utc: change.utc,
      })),
    });

    let saveStatusCounts = {};
    let errors = [];
    saveResult.data.forEach(({ id, utc, saveStatus = "error", error }) => {
      if (!saveStatusCounts[saveStatus]) {
        saveStatusCounts[saveStatus] = 0;
      }

      saveStatusCounts[saveStatus]++;

      if (saveStatus === "error") {
        errors.push({ id, utc, error });
      }
    });

    console.log(
      `\tSaved ${
        pageResults.data.items.length
      } changes with the following states:\n\t${Object.entries(saveStatusCounts)
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join("\n\t")}`
    );

    if (errors.length > 0) {
      errorsOccurred = true;
      console.log(
        `The following error occurred:\n\t${errors
          .map(({ id, utc, error }) => `Instance '${id}' at ${utc}: ${error}`)
          .join("\n\t")}`
      );
    }
  } while (totalAvailableItems > offset);

  console.log(
    `Finished migrating entity changes:\n\tENVIRONMENT: ${CONFIG.migrateFrom.environment} -> ${CONFIG.migrateTo.environment}\n\tENTITY: ${CONFIG.migrateFrom.entity} -> ${CONFIG.migrateTo.entity}`
  );

  if (errorsOccurred) {
    console.log(
      `Some errors occurred while the migrating process. Check the log above for details.`
    );
  }
};

main();
