import * as fs from 'node:fs';
import JSON5 from 'json5';
import { VARIABLES_FILE_NAME } from '../constants';

export function readPPVariablesAsEnv(configDirPath: string): Record<string, string> {
  const variablesPath = `${configDirPath}/${VARIABLES_FILE_NAME}`;
  if (!fs.existsSync(variablesPath)) return {};
  try {
    const variablesContent = fs.readFileSync(variablesPath, 'utf8');
    const variables = JSON5.parse(variablesContent) as Record<string, unknown>;
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      env[key] = stringValue;
    }
    return env;
  } catch {
    return {};
  }
}
