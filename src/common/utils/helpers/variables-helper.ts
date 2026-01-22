import { VARIABLES_FILE_NAME } from 'src/common/constants';
import { ConfigManager } from 'src/common/core/config-manager';
import { JsonHelper } from './json-helper';
import { FileIOHelper } from './node-helper';
import { TypeGuardsHelper } from './type-guards-helper';

export type VariablesState = Record<string, unknown>;

export class VariablesHelper {
  static getPath(workspace: string): string {
    return ConfigManager.getConfigFilePathFromWorkspacePath(workspace, VARIABLES_FILE_NAME);
  }

  static load(workspace: string): VariablesState {
    const filePath = VariablesHelper.getPath(workspace);
    if (!FileIOHelper.fileExists(filePath)) return {};
    try {
      const content = FileIOHelper.readFile(filePath);
      const parsed = JsonHelper.parse(content);
      if (!parsed || !TypeGuardsHelper.isObject(parsed)) {
        return {};
      }
      return parsed as VariablesState;
    } catch {
      return {};
    }
  }

  static save(workspace: string, state: VariablesState) {
    const filePath = VariablesHelper.getPath(workspace);
    FileIOHelper.writeFile(filePath, JsonHelper.stringifyPretty(state));
  }

  static getValue<T>(workspace: string, key: string): T | undefined {
    const state = VariablesHelper.load(workspace);
    return state[key] as T | undefined;
  }

  static setValue(workspace: string, key: string, value: unknown) {
    const state = VariablesHelper.load(workspace);
    state[key] = value;
    VariablesHelper.save(workspace, state);
  }

  static deleteValue(workspace: string, key: string) {
    const state = VariablesHelper.load(workspace);
    delete state[key];
    VariablesHelper.save(workspace, state);
  }
}
