import { z } from 'zod';
import { DevPanelConfigSchema, GlobalActionsConfigSchema } from '../src/common/schemas';
import { JsonHelper } from '../src/common/utils/helpers/json-helper';
import { FileIOHelper, NodePathHelper } from '../src/common/utils/helpers/node-helper';

const logger = console;

const schemas = [
  { name: 'schema.json', schema: DevPanelConfigSchema },
  { name: 'global-actions-schema.json', schema: GlobalActionsConfigSchema },
];

for (const item of schemas) {
  const jsonSchema = z.toJSONSchema(item.schema, { target: 'draft-7' });
  const schemaPath = NodePathHelper.join(__dirname, '..', 'resources', item.name);
  FileIOHelper.writeFile(schemaPath, JsonHelper.stringifyPretty(jsonSchema));
  logger.log(`Schema generated at: ${schemaPath}`);
}
