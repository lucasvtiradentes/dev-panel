import { z } from 'zod';
import { DevPanelConfigSchema } from '../src/common/schemas';
import { FileIOHelper, NodePathHelper } from '../src/common/utils/helpers/node-helper';

const logger = console;

const jsonSchema = z.toJSONSchema(DevPanelConfigSchema, { target: 'draft-7' });

const schemaPath = NodePathHelper.join(__dirname, '..', 'resources', 'schema.json');
FileIOHelper.writeFile(schemaPath, JSON.stringify(jsonSchema, null, 2));

logger.log(`Schema generated at: ${schemaPath}`);
