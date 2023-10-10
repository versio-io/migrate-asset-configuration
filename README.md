# Migrate Versio.io instances

### Requirements
A NodeJS installation on your computer is required.  
The file uses the node modules, which needs to be installed with `npm install`.

### Description
The script allows Versio.io users to copy instances in an environment (e.g. to rename the entity) or to migrate between environments.

The instance history remains unchanged. In the target environment, instances look exactly as they did in the original environment. 

Users must have API access to the original and target environments.

### Required user inputs in `const CONFIG`

`const CONFIG` is the only place in the file you need to make changes to

|Parameter|Description|Advice|
|---------|-----------|------|
|**migrateFrom**|||
|- entity|Already existing entity name||
|- serverURL|Versio.io server URL where the entity exists||
|- apiToken|API token of the server||
|- environment|Environment where the entity exists||
|**migrateTo**|||
|- entity|Desired entity name in the target environment|If entity name already exists, instances will be added to the existing entity. No Overwriting.|
|- serverURL| Versio.io server URL for the migrated entity||
|- apiToken|API token of the server||
|- environment|Environment of the migrated entity||
