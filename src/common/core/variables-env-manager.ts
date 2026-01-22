import { readJsoncFile } from '../utils/functions/read-jsonc-file';
import { JsonHelper } from '../utils/helpers/json-helper';
import { FileIOHelper } from '../utils/helpers/node-helper';
import { TypeGuardsHelper } from '../utils/helpers/type-guards-helper';

export class VariablesEnvManager {
  static loadVariablesFromPath(variablesPath: string): Record<string, unknown> | null {
    if (!FileIOHelper.fileExists(variablesPath)) return null;
    try {
      const content = FileIOHelper.readFile(variablesPath);
      return readJsoncFile(content);
    } catch {
      return null;
    }
  }

  static readDevPanelVariablesAsEnv(variablesPath: string): Record<string, string> {
    const variables = VariablesEnvManager.loadVariablesFromPath(variablesPath);
    if (!variables) return {};

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      const stringValue = TypeGuardsHelper.isObjectLike(value) ? JsonHelper.stringify(value) : String(value);
      env[key] = stringValue;
    }
    return env;
  }
}
