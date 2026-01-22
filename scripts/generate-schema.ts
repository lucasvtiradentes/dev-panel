import { z } from 'zod';
import { DevPanelConfigSchema } from '../src/common/schemas';
import { JsonHelper } from '../src/common/utils/helpers/json-helper';
import { FileIOHelper, NodePathHelper } from '../src/common/utils/helpers/node-helper';

const logger = console;

const jsonSchema = z.toJSONSchema(DevPanelConfigSchema, { target: 'draft-7' });

const schemaPath = NodePathHelper.join(__dirname, '..', 'resources', 'schema.json');
FileIOHelper.writeFile(schemaPath, JsonHelper.stringifyPretty(jsonSchema));

logger.log(`Schema generated at: ${schemaPath}`);
