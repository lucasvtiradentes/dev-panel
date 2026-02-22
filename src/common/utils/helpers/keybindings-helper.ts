import { readJsoncFile } from '../functions/read-jsonc-file';
import { JsonHelper } from './json-helper';
import { FileIOHelper } from './node-helper';

export type Keybinding = {
  key: string;
  command: string;
  when?: string;
};

export class KeybindingsHelper {
  static load(filePath: string): Keybinding[] {
    if (!FileIOHelper.fileExists(filePath)) return [];
    try {
      const content = FileIOHelper.readFile(filePath);
      if (!content.trim()) return [];
      return readJsoncFile<Keybinding[]>(content) ?? [];
    } catch {
      return [];
    }
  }

  static save(filePath: string, keybindings: Keybinding[]) {
    FileIOHelper.writeFile(filePath, JsonHelper.stringifyPretty(keybindings));
  }

  static parse(content: string): Keybinding[] {
    try {
      if (!content.trim()) return [];
      return readJsoncFile<Keybinding[]>(content) ?? [];
    } catch {
      return [];
    }
  }
}
