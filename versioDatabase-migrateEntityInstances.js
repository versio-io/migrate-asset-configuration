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

const main = async () => {
  console.log(
    `Start migrating entity changes:\n\tSERVER: ${CONFIG.migrateFrom.serverURL} -> ${CONFIG.migrateTo.serverURL}\n\tENVIRONMENT: ${CONFIG.migrateFrom.environment} -> ${CONFIG.migrateTo.environment}\n\tENTITY: ${CONFIG.migrateFrom.entity} -> ${CONFIG.migrateTo.entity}`
  );

  let offset = 0;
  let totalAvailableItems = 0;
  let pageCount = 1;
  let errorsOccurred = false;

  do {
    console.log(
      `\tGet page ${pageCount} (OFFSET ${offset} | LIMIT ${PAGE_SIZE}).`
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
      `\t\tGot changes ${offset + 1}-${
        offset + pageResults.data.items.length
      } from ${pageResults.data.totalAvailableItems}.`
    );

    totalAvailableItems = pageResults.data.totalAvailableItems;
    offset = offset + PAGE_SIZE;
    pageCount++;

    console.log(`\tSaving changes.`);
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
      `\t\tSaved ${
        pageResults.data.items.length
      } changes with the following states:\n\t\t\t${Object.entries(
        saveStatusCounts
      )
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join("\n\t\t\t")}`
    );

    if (errors.length > 0) {
      errorsOccurred = true;
      console.log(
        `\t\t\t\tThe following error occurred:\n\t${errors
          .map(({ id, utc, error }) => `Instance '${id}' at ${utc}: ${error}`)
          .join("\n\t")}`
      );
    }
  } while (totalAvailableItems > offset);

  console.log(
    `Finished migrating entity changes:\n\tSERVER: ${CONFIG.migrateFrom.serverURL} -> ${CONFIG.migrateTo.serverURL}\n\tENVIRONMENT: ${CONFIG.migrateFrom.environment} -> ${CONFIG.migrateTo.environment}\n\tENTITY: ${CONFIG.migrateFrom.entity} -> ${CONFIG.migrateTo.entity}`
  );

  if (errorsOccurred) {
    console.log(
      `Some errors occurred while the migrating process. Check the log above for details.`
    );
  }
};

main();
