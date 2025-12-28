import { DIST_DIR_PREFIX, PACKAGE_JSON, PACKAGE_JSON_SCRIPTS_PATTERN } from '../constants';
import { FileIOHelper, NodePathHelper } from '../utils/helpers/node-helper';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { WorkspaceFolder } from '../vscode/vscode-types';

export class PackageJsonHelper {
  static async findAllPackageJsons(folder: WorkspaceFolder, excludedDirs: Set<string>): Promise<string[]> {
    const packageJsons: string[] = [];

    async function scan(dir: string) {
      const entries = FileIOHelper.readDirectory(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (excludedDirs.has(entry.name) || entry.name.startsWith(DIST_DIR_PREFIX)) continue;

        const fullPath = NodePathHelper.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name === PACKAGE_JSON) {
          packageJsons.push(fullPath);
        }
      }
    }

    await scan(folder.uri.fsPath);
    return packageJsons;
  }

  static async openPackageJsonAtScripts(packageJsonPath: string) {
    const content = FileIOHelper.readFile(packageJsonPath);
    const lines = content.split('\n');
    let scriptsLine = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(PACKAGE_JSON_SCRIPTS_PATTERN)) {
        scriptsLine = i;
        break;
      }
    }

    const uri = VscodeHelper.createFileUri(packageJsonPath);
    await VscodeHelper.openDocumentAtLine(uri, scriptsLine);
  }
}
