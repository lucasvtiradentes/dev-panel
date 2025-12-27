import * as fs from 'node:fs';
import JSON5 from 'json5';

export function parseVariables(content: string): Record<string, unknown> | null {
  try {
    return JSON5.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function loadVariablesFromPath(variablesPath: string): Record<string, unknown> | null {
  if (!fs.existsSync(variablesPath)) return null;
  try {
    const content = fs.readFileSync(variablesPath, 'utf8');
    return parseVariables(content);
  } catch {
    return null;
  }
}

export function readDevPanelVariablesAsEnv(variablesPath: string): Record<string, string> {
  const variables = loadVariablesFromPath(variablesPath);
  if (!variables) return {};

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    env[key] = stringValue;
  }
  return env;
}
