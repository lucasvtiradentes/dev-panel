import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const logger = console;

const SCRIPT_DIR = __dirname;
const ROOT_DIR = join(SCRIPT_DIR, '..', '..');
const DEV_SUFFIX = 'dev';
const EXTENSION_NAME = 'better-project-tools';
const EXTENSION_ID_DEV = `lucasvtiradentes.${EXTENSION_NAME}-${DEV_SUFFIX}`;

async function main() {
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    logger.log('Skipping local extension installation in CI environment');
    process.exit(0);
  }

  await setupLocalDistDirectory();
  await copyExtensionFiles();
  await writePackageJson();
  await copyMetaFiles();
  await copyToVSCodeExtensions();
  await printSuccessMessage();
}

main();

async function setupLocalDistDirectory() {
  const targetDir = getLocalDistDirectory();
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true });
  }
  mkdirSync(targetDir, { recursive: true });
}

async function copyExtensionFiles() {
  const targetDir = getLocalDistDirectory();
  copyRecursive(join(ROOT_DIR, 'out'), join(targetDir, 'out'));
  copyRecursive(join(ROOT_DIR, 'resources'), join(targetDir, 'resources'));
}

async function writePackageJson() {
  const targetDir = getLocalDistDirectory();
  const packageJsonPath = join(ROOT_DIR, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  packageJson.name = `${packageJson.name}-dev`;
  packageJson.displayName = `${packageJson.displayName} (DEV)`;

  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));
}

async function copyMetaFiles() {
  const targetDir = getLocalDistDirectory();

  const licensePath = join(ROOT_DIR, 'LICENSE');
  if (existsSync(licensePath)) {
    copyFileSync(licensePath, join(targetDir, 'LICENSE'));
  }

  const readmePath = join(ROOT_DIR, 'README.md');
  if (existsSync(readmePath)) {
    copyFileSync(readmePath, join(targetDir, 'README.md'));
  }
}

async function copyToVSCodeExtensions() {
  const sourceDir = getLocalDistDirectory();
  const installedEditors: string[] = [];

  for (const editor of Object.values(Editor)) {
    const extensionsPath = getEditorExtensionsPath(editor);
    if (!existsSync(extensionsPath)) continue;

    const targetDir = join(extensionsPath, EXTENSION_ID_DEV);
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true });
    }
    mkdirSync(targetDir, { recursive: true });
    copyRecursive(sourceDir, targetDir);
    installedEditors.push(EDITOR_DISPLAY_NAMES[editor]);
  }

  if (installedEditors.length === 0) {
    logger.log('[VSCode] ⚠️  No editors found');
  } else {
    logger.log(`[VSCode] ✅ Installed to: ${installedEditors.join(', ')}`);
  }
}

async function printSuccessMessage() {
  logger.log(`[VSCode] ✅ ID: ${EXTENSION_ID_DEV} - Reload editor to activate`);
}

function getLocalDistDirectory(): string {
  return join(ROOT_DIR, 'dist-dev');
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
    [Editor.VSCode]: join(homedir(), '.vscode', 'extensions'),
    [Editor.Cursor]: join(homedir(), '.cursor', 'extensions'),
    [Editor.Windsurf]: join(homedir(), '.windsurf', 'extensions'),
    [Editor.VSCodium]:
      process.platform === 'darwin'
        ? join(homedir(), '.vscode-oss', 'extensions')
        : join(homedir(), '.config', 'VSCodium', 'extensions'),
  };
  return paths[editor];
}

function copyRecursive(src: string, dest: string): void {
  const stat = statSync(src);

  if (stat.isDirectory()) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src);
    for (const entry of entries) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    copyFileSync(src, dest);
  }
}
