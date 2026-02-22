import { JsonHelper } from './json-helper';
import { FileIOHelper } from './node-helper';

type PackageJson = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  [key: string]: unknown;
};

export class PackageJsonHelper {
  static read(filePath: string): PackageJson | null {
    if (!FileIOHelper.fileExists(filePath)) return null;
    try {
      const content = FileIOHelper.readFile(filePath);
      return JsonHelper.parse<PackageJson>(content);
    } catch {
      return null;
    }
  }

  static readOrThrow(filePath: string): PackageJson {
    const content = FileIOHelper.readFile(filePath);
    return JsonHelper.parseOrThrow<PackageJson>(content);
  }

  static readScripts(filePath: string): Record<string, string> {
    const pkg = PackageJsonHelper.read(filePath);
    return pkg?.scripts ?? {};
  }

  static write(filePath: string, packageJson: PackageJson) {
    FileIOHelper.writeFile(filePath, JsonHelper.stringifyPretty(packageJson));
  }
}
