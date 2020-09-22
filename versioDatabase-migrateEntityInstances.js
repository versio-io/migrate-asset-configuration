/* Copyright (C) QMETHODS - Business & IT Consulting GmbH - All Rights Reserved
* Unauthorized copying of this file, via any medium is strictly prohibited
* Proprietary and confidential
* author: roman.bauer@qmethods.com
*/

// Require used modules.
const request = require("request-promise-native");

// User input
const config = {
  "name": "",
  "description": "",
  "migrateInstance": false,
  "migrateConfiguration": true,
  "migrateFrom": {
    "entity": "user-datadog",
    "serverURL": "https://dev-hetzner.versio.io",
    "apiToken": "5gXTjYBwMXSwtogoyfrctM:0zoo662lf8f2ls6PSqksmD",
    "environment": "roman2"
  },
  "migrateTo": {
    "entity": "user-datadog",
    "serverURL": "https://live.versio.io",
    "apiToken": "41PwyJiUmw6jJVboaIVpgB:3LAMFsSTX9MFjxdtcnsMvc",
    "environment": "ingufdiujo"
  }
}

const apiVersion = "/api-versio.db/1.0/";

// Maximum number of results with one request
const limit = 100;

const main = async () => {

  // Migrate instances first
  if (config.migrateInstance === true) {
    await getEntityFromVersio(config);
  } else {
    console.log("'migrateInstance' set to 'false'. No instances will be migrated. ")
  }
  if (config.migrateConfiguration === true) {
    await getConfigurationFromVersio(config);
  } else {
    console.log("'migrateConfiguration' set to 'false'. No configuration will be migrated. ")
  }

}


function getEntityFromVersio(config) {

  // Move instance of given entity to another environment or entity
  // GET instance IDs
  console.log("GET all instance IDs of the given entity '" + config.migrateFrom.entity + "'.");
  let offsetIds = 0;
  // With large results, multiple GET requests are required to get all instances
  do {
    let entityUrlIds = config.migrateFrom.serverURL + apiVersion + config.migrateFrom.environment + "/" + config.migrateFrom.entity + "?limit=" + limit + "&offset=" + offsetIds;

    let options = {
      method: "GET",
      uri: entityUrlIds,
      headers: {
        "Authorization": "apiToken " + config.migrateFrom.apiToken
      }
    };

    return (
      request(options)
        .then(async sourceResponse => {
          let sourceResponseBody = JSON.parse(sourceResponse);
          if (sourceResponseBody.totalAvailableItems > (offsetIds + limit)) {
            offsetIds += limit;
          } else {
            offsetIds = false;
          }
          let instances = sourceResponseBody.items;

          console.log("Found " + instances.length + " instance IDs. ");

          await instances.reduce((promiseChain, instance) => {
            return promiseChain.then(async () => {

              console.log("     GET change information for every instance. ");

              let offsetInstances = 0;
              // GET all changes of one instance
              // With large results, multiple GET requests are required to get all changes
              do {
                let entityUrlInstances = config.migrateFrom.serverURL + apiVersion + config.migrateFrom.environment + "/" + config.migrateFrom.entity + "/" + instance + "?content=changes&limit=" + limit + "&offset=" + offsetInstances + "&utcStart=0000000000000&utcEnd=9999999999999&sortTime=asc";

                options = {
                  method: "GET",
                  uri: entityUrlInstances,
                  headers: {
                    "Authorization": "apiToken " + config.migrateFrom.apiToken
                  }
                };

                return (
                  request(options)
                    .then(async sourceResponse => {
                      let changeResponseBody = JSON.parse(sourceResponse);
                      if (changeResponseBody.totalAvailableItems > (offsetInstances + limit)) {
                        offsetInstances += limit;
                      } else {
                        offsetInstances = false;
                      }
                      let changes = changeResponseBody.items.map(item => item);

                      console.log("     Import instances with their change information to Versio.io. ");

                      await changes.reduce((promiseChain2, change) => {
                        return promiseChain2.then(async () => {

                          // Status of instance: created or updated
                          if (change.type !== 2) {
                            let entityUrl = config.migrateTo.serverURL + apiVersion + config.migrateTo.environment + "/" + config.migrateTo.entity + "/" + change.instance + "?utc=" + change.utc;

                            options = {
                              method: "PUT",
                              uri: entityUrl,
                              headers: {
                                "Authorization": "apiToken " + config.migrateTo.apiToken,
                                "Content-Type": "application/json"
                              },
                              body: JSON.stringify(change.state)
                            };

                            // Import instances to Versio.io
                            return (
                              request(options)
                                .then(async sourceResponse => {
                                  console.log("           Import of change for instance '" + change.instance + "' at timestamp " + change.utc + " finished. ");
                                })
                                .catch(error => {
                                  console.log("           Could not create change in Versio.io. " + error);
                                })
                            );

                          }
                          // Status of instance: deleted
                          else {



                            // IMPLEMENT DELETE HERE



                            // entityUrl = config.migrateTo.serverURL + apiVersion + config.migrateTo.environment + "/" + config.migrateTo.entity + "/" + change.instance + "?utc=" + change.utc;

                            // options = {
                            //   method: "DELETE",
                            //   uri: entityUrl,
                            //   "Authorization": "apiToken " + config.migrateFrom.apiToken,
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
                      }, Promise.resolve([])).then(() => { });
                    })
                    .catch(error => {
                      console.log("     Could not get specific instance from Versio.io.  " + error);
                    })
                );
              } while (offsetInstances)
            });
          }, Promise.resolve([])).then(() => { });
        })
        .catch(error => {
          console.log("Could not get instances from requested entity from Versio.io. " + error);
        })

    );
  } while (offsetIds)

}

function getConfigurationFromVersio(config) {
  // Import entity configuration to new environment
  // GET entity configuration of old environment
  console.log("GET entity configurations of old environment '" + config.migrateFrom.environment + "'.");
  const apiVersioManagement = "/api-versio.management/1.0/";
  let entityUrlConfig = config.migrateFrom.serverURL + apiVersioManagement + "configurationTopics/" + config.migrateFrom.environment + "/configurations/conf-entities";

  let options = {
    method: "GET",
    uri: entityUrlConfig,
    headers: {
      "Authorization": "apiToken " + config.migrateFrom.apiToken,
    }
  };

  let relevantConfig;

  return (
    request(options)
      .then(async sourceResponse => {
        let oldConfig = JSON.parse(sourceResponse);
        relevantConfig = oldConfig.configuration[config.migrateFrom.entity];

        console.log("GET entity configurations of new environment '" + config.migrateTo.environment + "'.");
        // GET entity configuration of new environment

        entityUrlConfig = config.migrateTo.serverURL + apiVersioManagement + "configurationTopics/" + config.migrateTo.environment + "/configurations/conf-entities";

        options = {
          method: "GET",
          uri: entityUrlConfig,
          headers: {
            "Authorization": "apiToken " + config.migrateTo.apiToken,
          },
          // json:true
        };

        return (
          request(options)
            .then(async sourceResponse => {
              const parsedBody = JSON.parse(sourceResponse);
              let newConfig = parsedBody.configuration;

              console.log("     Add entity configuration of '" + config.migrateFrom.entity + "'to new environment's configuration. ");
              // Add entity configuration to new environment's configuration
              // Overwrite new Config if entity already exists

              newConfig[config.migrateTo.entity] = relevantConfig;

              console.log("     Import updated configuration to Versio.io. ");
              let date = new Date(parsedBody.lastChangeUtc);
              let dateHeaderString = date.toUTCString();

              options = {
                method: "PUT",
                uri: entityUrlConfig,
                headers: {
                  "Authorization": "apiToken " + config.migrateTo.apiToken,
                  "If-Unmodified-Since": dateHeaderString,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(newConfig)
              };

              return (
                request(options)
                  .then(async sourceResponse => {
                    console.log("           Import into '" + config.migrateTo.entity + "' successful. ");
                  })
                  .catch(error => {
                    console.log("           Import into Versio.io failed. " + error);
                  })
              );
            })
            .catch(error => {
              console.log("     Import of new environment's configuration failed. " + error);
            })
        );
      })
      .catch(error => {
        console.log("     Import of old environment's configuration failed. " + error);
      })
  );
}

main();


