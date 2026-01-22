import { JsonHelper } from '../../src/common/utils/helpers/json-helper';
import { FileIOHelper } from '../../src/common/utils/helpers/node-helper';

export type ExtensionEntry = {
  identifier?: { id: string };
  version?: string;
  location?: { $mid: number; path: string; scheme: string };
  relativeLocation?: string;
};

export class ExtensionsJsonHelper {
  static read(filePath: string): ExtensionEntry[] {
    if (!FileIOHelper.fileExists(filePath)) return [];
    try {
      const content = FileIOHelper.readFile(filePath);
      return JsonHelper.parseOrThrow<ExtensionEntry[]>(content);
    } catch {
      return [];
    }
  }

  static write(filePath: string, entries: ExtensionEntry[]) {
    FileIOHelper.writeFile(filePath, JsonHelper.stringifyPretty(entries));
  }

  static findById(entries: ExtensionEntry[], id: string): ExtensionEntry | undefined {
    return entries.find((ext) => ext.identifier?.id === id);
  }

  static removeById(entries: ExtensionEntry[], id: string): ExtensionEntry[] {
    return entries.filter((ext) => ext.identifier?.id !== id);
  }
}
