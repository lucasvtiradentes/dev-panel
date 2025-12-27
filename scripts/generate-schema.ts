import { z } from 'zod';
import { FileIOHelper, NodePathHelper } from '../src/common/lib/node-helper';
import { DevPanelConfigSchema } from '../src/common/schemas';

const logger = console;

const jsonSchema = z.toJSONSchema(DevPanelConfigSchema, { target: 'draft-7' });

const schemaPath = NodePathHelper.join(__dirname, '..', 'resources', 'schema.json');
FileIOHelper.writeFile(schemaPath, JSON.stringify(jsonSchema, null, 2));

logger.log(`Schema generated at: ${schemaPath}`);
