import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { PPConfigSchema } from '../src/common/schemas';

const jsonSchema = z.toJSONSchema(PPConfigSchema, { target: 'draft-7' });

const schemaPath = path.join(__dirname, '..', 'resources', 'schema.json');
fs.writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2));

console.log(`Schema generated at: ${schemaPath}`);
