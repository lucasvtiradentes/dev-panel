import { statSync } from 'node:fs';
import {
  CONTEXT_PREFIX,
  DEV_SUFFIX,
  EDITOR_EXTENSIONS_PATHS,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_NAME,
  LOCAL_DIST_DIR,
  VIEW_ID_TASKS,
  VSCODE_STANDARD_CONTAINERS,
  addDevLabel,
  addDevSuffix,
  buildExtensionId,
  buildLogFilename,
} from '../../src/common/constants/scripts-constants';
import {
  LICENSE_FILE,
  PACKAGE_JSON,
  README_FILE,
  VSCODE_EXTENSIONS_FILE,
} from '../../src/common/constants/vscode-constants';
import { FileIOHelper, NodeOsHelper, NodePathHelper } from '../../src/common/lib/node-helper';

const logger = console;

const SCRIPT_DIR = __dirname;
const ROOT_DIR = NodePathHelper.join(SCRIPT_DIR, '..', '..');
const EXTENSION_ID_DEV = buildExtensionId(true);

function main() {
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    logger.log('Skipping local extension installation in CI environment');
    process.exit(0);
  }

  setupLocalDistDirectory();
  copyExtensionFiles();
  patchExtensionCode();
  writePackageJson();
  copyMetaFiles();
  copyToVSCodeExtensions();
  registerExtensionInEditors();
  printSuccessMessage();
}

function setupLocalDistDirectory() {
  const targetDir = getLocalDistDirectory();
  FileIOHelper.deleteDirectory(targetDir);
  FileIOHelper.ensureDirectoryExists(targetDir);
}

function copyExtensionFiles() {
  const targetDir = getLocalDistDirectory();
  copyRecursive(NodePathHelper.join(ROOT_DIR, 'out'), NodePathHelper.join(targetDir, 'out'));
  copyRecursive(NodePathHelper.join(ROOT_DIR, 'resources'), NodePathHelper.join(targetDir, 'resources'));
}

function patchExtensionCode() {
  const targetDir = getLocalDistDirectory();
  const extensionJsPath = NodePathHelper.join(targetDir, 'out', 'extension.js');

  const extensionJs = FileIOHelper.readFile(extensionJsPath);
  const isDevUnminified = /var IS_DEV = false;/;
  const logFileProd = buildLogFilename(false);
  const logFileDev = buildLogFilename(true);
  const logFilePattern = new RegExp(logFileProd.replace('.', '\\.'), 'g');
  const statusBarPattern = new RegExp(`${EXTENSION_DISPLAY_NAME}:`, 'g');

  let patchedExtensionJs = extensionJs;

  if (isDevUnminified.test(patchedExtensionJs)) {
    patchedExtensionJs = patchedExtensionJs.replace(isDevUnminified, 'var IS_DEV = true;');
  } else {
    patchedExtensionJs = patchedExtensionJs.replace(logFilePattern, logFileDev);
    patchedExtensionJs = patchedExtensionJs.replace(statusBarPattern, `${addDevLabel(EXTENSION_DISPLAY_NAME)}:`);
  }

  FileIOHelper.writeFile(extensionJsPath, patchedExtensionJs);
}

function writePackageJson() {
  const targetDir = getLocalDistDirectory();
  const packageJsonPath = NodePathHelper.join(ROOT_DIR, PACKAGE_JSON);
  const packageJson = JSON.parse(FileIOHelper.readFile(packageJsonPath));
  const modifiedPackageJson = applyDevTransformations(packageJson);
  FileIOHelper.writeFile(NodePathHelper.join(targetDir, PACKAGE_JSON), JSON.stringify(modifiedPackageJson, null, 2));
}

function copyMetaFiles() {
  const targetDir = getLocalDistDirectory();

  const licensePath = NodePathHelper.join(ROOT_DIR, LICENSE_FILE);
  if (FileIOHelper.fileExists(licensePath)) {
    FileIOHelper.copyFile(licensePath, NodePathHelper.join(targetDir, LICENSE_FILE));
  }

  const readmePath = NodePathHelper.join(ROOT_DIR, README_FILE);
  if (FileIOHelper.fileExists(readmePath)) {
    FileIOHelper.copyFile(readmePath, NodePathHelper.join(targetDir, README_FILE));
  }
}

function copyToVSCodeExtensions() {
  const sourceDir = getLocalDistDirectory();
  const installedEditors: string[] = [];

  for (const editor of Object.values(Editor)) {
    const extensionsPath = getEditorExtensionsPath(editor);
    if (!FileIOHelper.fileExists(extensionsPath)) continue;

    const targetDir = NodePathHelper.join(extensionsPath, EXTENSION_ID_DEV);
    FileIOHelper.deleteDirectory(targetDir);
    FileIOHelper.ensureDirectoryExists(targetDir);
    copyRecursive(sourceDir, targetDir);
    installedEditors.push(EDITOR_DISPLAY_NAMES[editor]);
  }

  if (installedEditors.length === 0) {
    logger.log('[VSCode] ⚠️  No editors found');
  } else {
    logger.log(`[VSCode] ✅ Installed to: ${installedEditors.join(', ')}`);
  }
}

function registerExtensionInEditors() {
  const targetDir = getLocalDistDirectory();
  const packageJsonPath = NodePathHelper.join(targetDir, PACKAGE_JSON);
  const packageJson = JSON.parse(FileIOHelper.readFile(packageJsonPath));
  const version = packageJson.version as string;

  for (const editor of Object.values(Editor)) {
    const extensionsPath = getEditorExtensionsPath(editor);
    if (!FileIOHelper.fileExists(extensionsPath)) continue;

    const extensionsJsonPath = NodePathHelper.join(extensionsPath, VSCODE_EXTENSIONS_FILE);
    if (!FileIOHelper.fileExists(extensionsJsonPath)) continue;

    try {
      const extensionsJson = JSON.parse(FileIOHelper.readFile(extensionsJsonPath)) as ExtensionEntry[];

      const filteredExtensions = extensionsJson.filter((ext) => ext.identifier?.id !== EXTENSION_ID_DEV);

      const newEntry: ExtensionEntry = {
        identifier: {
          id: EXTENSION_ID_DEV,
        },
        version,
        location: {
          $mid: 1,
          path: NodePathHelper.join(extensionsPath, EXTENSION_ID_DEV),
          scheme: 'file',
        },
        relativeLocation: EXTENSION_ID_DEV,
      };

      filteredExtensions.push(newEntry);

      FileIOHelper.writeFile(extensionsJsonPath, JSON.stringify(filteredExtensions, null, 2));
      logger.log(`[VSCode] ✅ Registered in ${EDITOR_DISPLAY_NAMES[editor]} extensions.json`);
    } catch (error) {
      logger.log(`[VSCode] ⚠️  Failed to register in ${EDITOR_DISPLAY_NAMES[editor]}: ${error}`);
    }
  }
}

type ExtensionEntry = {
  identifier?: { id: string };
  version?: string;
  location?: { $mid: number; path: string; scheme: string };
  relativeLocation?: string;
};

function printSuccessMessage() {
  logger.log(`[VSCode] ✅ ID: ${EXTENSION_ID_DEV} - Reload editor to activate`);
}

function getLocalDistDirectory(): string {
  return NodePathHelper.join(ROOT_DIR, LOCAL_DIST_DIR);
}

enum Editor {
  VSCode = 'vscode',
  Cursor = 'cursor',
  VSCodium = 'vscodium',
  Windsurf = 'windsurf',
}

const EDITOR_DISPLAY_NAMES: Record<Editor, string> = {
  [Editor.VSCode]: 'VSCode',
  [Editor.Cursor]: 'Cursor',
  [Editor.VSCodium]: 'VSCodium',
  [Editor.Windsurf]: 'Windsurf',
};

function getEditorExtensionsPath(editor: Editor): string {
  const paths: Record<Editor, string> = {
    [Editor.VSCode]: NodePathHelper.join(NodeOsHelper.homedir(), EDITOR_EXTENSIONS_PATHS.vscode),
    [Editor.Cursor]: NodePathHelper.join(NodeOsHelper.homedir(), EDITOR_EXTENSIONS_PATHS.cursor),
    [Editor.Windsurf]: NodePathHelper.join(NodeOsHelper.homedir(), EDITOR_EXTENSIONS_PATHS.windsurf),
    [Editor.VSCodium]:
      process.platform === 'darwin'
        ? NodePathHelper.join(NodeOsHelper.homedir(), EDITOR_EXTENSIONS_PATHS.vscodium.darwin)
        : NodePathHelper.join(NodeOsHelper.homedir(), EDITOR_EXTENSIONS_PATHS.vscodium.linux),
  };
  return paths[editor];
}

function copyRecursive(src: string, dest: string) {
  const stat = statSync(src);

  if (stat.isDirectory()) {
    FileIOHelper.ensureDirectoryExists(dest);

    const entries = FileIOHelper.readDirectory(src, { withFileTypes: false });
    for (const entry of entries) {
      copyRecursive(NodePathHelper.join(src, entry), NodePathHelper.join(dest, entry));
    }
  } else {
    FileIOHelper.copyFile(src, dest);
  }
}

function transformContextKey(text: string): string {
  return text
    .replace(new RegExp(`view\\s*==\\s*${VIEW_ID_TASKS}\\b`, 'g'), `view == ${addDevSuffix(VIEW_ID_TASKS)}`)
    .replace(/\b(\w+)(?=\s*==|\s*!=|\s|$)/g, (match) => {
      if (match.startsWith(CONTEXT_PREFIX) && !match.endsWith(DEV_SUFFIX)) {
        return addDevSuffix(match);
      }
      return match;
    });
}

function transformCommand(cmd: string): string {
  if (!cmd.startsWith(`${CONTEXT_PREFIX}.`)) return cmd;
  return cmd.replace(`${CONTEXT_PREFIX}.`, `${addDevSuffix(CONTEXT_PREFIX)}.`);
}

function transformTitle(title: string): string {
  if (title.startsWith(`${EXTENSION_DISPLAY_NAME}:`)) {
    return title.replace(`${EXTENSION_DISPLAY_NAME}:`, `${EXTENSION_DISPLAY_NAME} (${DEV_SUFFIX}):`);
  }
  if (title.startsWith(`${CONTEXT_PREFIX}:`)) {
    return title.replace(`${CONTEXT_PREFIX}:`, `${CONTEXT_PREFIX} (${DEV_SUFFIX}):`);
  }
  return title;
}

function applyDevTransformations(pkg: Record<string, unknown>): Record<string, unknown> {
  const transformed = { ...pkg };

  transformed.name = `${EXTENSION_NAME}-${DEV_SUFFIX}`;
  transformed.displayName = addDevLabel(pkg.displayName as string);

  const contributes = transformed.contributes as Record<string, unknown>;
  if (!contributes) return transformed;

  if (contributes.viewsContainers) {
    const containers = contributes.viewsContainers as Record<string, unknown>;
    if (containers.activitybar) {
      containers.activitybar = (containers.activitybar as Array<{ id: string; title: string }>).map((container) => ({
        ...container,
        id: addDevSuffix(container.id),
        title: addDevLabel(container.title),
      }));
    }
  }

  if (contributes.views) {
    const views = contributes.views as Record<string, Array<{ id: string; name?: string }>>;
    const newViews: Record<string, unknown> = {};

    for (const [containerKey, viewList] of Object.entries(views)) {
      // Only transform custom containers, not standard ones
      const newContainerKey = VSCODE_STANDARD_CONTAINERS.includes(containerKey)
        ? containerKey
        : addDevSuffix(containerKey);
      newViews[newContainerKey] = viewList.map((view) => ({
        ...view,
        id: addDevSuffix(view.id),
        name: view.name ? addDevLabel(view.name) : undefined,
      }));
    }

    contributes.views = newViews;
  }

  if (contributes.viewsWelcome) {
    const viewsWelcome = contributes.viewsWelcome as Array<{ view: string; contents: string; when?: string }>;
    for (const welcome of viewsWelcome) {
      welcome.view = addDevSuffix(welcome.view);
      if (welcome.when) {
        welcome.when = transformContextKey(welcome.when);
      }
      if (welcome.contents) {
        welcome.contents = welcome.contents.replace(
          /\(command:([^)]+)\)/g,
          (_match, command: string) => `(command:${transformCommand(command)})`,
        );
      }
    }
  }

  if (contributes.menus) {
    const menus = contributes.menus as Record<string, Array<{ when?: string; command?: string }>>;

    for (const menuList of Object.values(menus)) {
      for (const menu of menuList) {
        if (menu.when) {
          menu.when = transformContextKey(menu.when);
        }
        if (menu.command) {
          menu.command = transformCommand(menu.command);
        }
      }
    }
  }

  if (contributes.commands) {
    const commands = contributes.commands as Array<{ command: string; title?: string; enablement?: string }>;
    for (const cmd of commands) {
      cmd.command = transformCommand(cmd.command);
      if (cmd.title) {
        cmd.title = transformTitle(cmd.title);
      }
      if (cmd.enablement) {
        cmd.enablement = transformContextKey(cmd.enablement);
      }
    }
  }

  if (contributes.keybindings) {
    const keybindings = contributes.keybindings as Array<{ when?: string; command?: string }>;
    for (const binding of keybindings) {
      if (binding.when) {
        binding.when = transformContextKey(binding.when);
      }
      if (binding.command) {
        binding.command = transformCommand(binding.command);
      }
    }
  }

  if (contributes.configuration) {
    const configuration = contributes.configuration as { title?: string; properties?: Record<string, unknown> };
    if (configuration.title) {
      configuration.title = addDevLabel(configuration.title);
    }
    if (configuration.properties) {
      const newProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(configuration.properties)) {
        const newKey = key.replace(`${CONTEXT_PREFIX}.`, `${addDevSuffix(CONTEXT_PREFIX)}.`);
        newProperties[newKey] = value;
      }
      configuration.properties = newProperties;
    }
  }

  return transformed;
}

main();
