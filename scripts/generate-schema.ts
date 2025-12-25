import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { DevPanelConfigSchema } from '../src/common/schemas';

const logger = console;

const jsonSchema = z.toJSONSchema(DevPanelConfigSchema, { target: 'draft-7' });

const schemaPath = path.join(__dirname, '..', 'resources', 'schema.json');
fs.writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2));

logger.log(`Schema generated at: ${schemaPath}`);
