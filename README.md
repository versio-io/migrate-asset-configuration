# README for migrateEntity.js

### Requirements
A NodeJS installation on your computer is required.  
The file uses the node modules, which needs to be installed with `npm install`.

### Description
MigrateEntity enables Versio.io users to determine an entity whose instances will be migrated to another place in Versio.io.

The instances of a given entity can either be migrated to another environment or a different entity within the same environment.  
The instance history remains unchanged. In the target environment/entity, the instances will look exactly the same as in the original environment. 

Users need to provide data from the original- and target environment.

### Required user inputs in `const CONFIG`

`const CONFIG` is the only place in the file you need to make changes to

|Parameter|Description|Advice|
|---------|-----------|------|
|migrateInstance|Set true, if the instances of the given entity should be migrated to the target environment/entity||
|migrateConfiguration|Set true, if the entity configuration should be migrated to the target environment/entity|Overwrites the entity configuration if it already exists in the target environment|
|**migrateFrom**|||
|- entity|Already existing entity name||
|- serverURL|Server URL where the entity exists||
|- apiToken|API token of the server||
|- environment|Environment where the entity exists||
|**migrateTo**|||
|- entity|Desired entity name in the target environment|If entity name already exists, instances will be added to the existing entity. No Overwriting.|
|- serverURL|Server URL for the migrated entity||
|- apiToken|API token of the server||
|- environment|Environment of the migrated entity||
