import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import {
  PLUGINS_DIR_NAME,
  PROMPTS_DIR_NAME,
  REGISTRY_BASE_URL,
  REGISTRY_CONFIG_FILE,
  REGISTRY_DEFAULT_PLUGIN_FILE,
  REGISTRY_DEFAULT_PROMPT_FILE,
  REGISTRY_DEFAULT_SCRIPT_FILE,
  REGISTRY_DEFAULT_TOOL_FILE,
  REGISTRY_INDEX_FILE,
  SCRIPTS_DIR_NAME,
  TOOLS_DIR,
} from '../constants';
import { type RegistryIndex, RegistryIndexSchema, type RegistryItemEntry, RegistryItemKind } from '../schemas';
import { getConfigDirPathFromWorkspacePath, getWorkspaceConfigDirPath } from './config-manager';
import { logger } from './logger';

type KindConfig = {
  dirName: string;
  defaultFile: string;
  configKey: 'plugins' | 'prompts' | 'tools' | 'scripts';
};

const KIND_CONFIG: Record<RegistryItemKind, KindConfig> = {
  [RegistryItemKind.Plugin]: {
    dirName: PLUGINS_DIR_NAME,
    defaultFile: REGISTRY_DEFAULT_PLUGIN_FILE,
    configKey: 'plugins',
  },
  [RegistryItemKind.Prompt]: {
    dirName: PROMPTS_DIR_NAME,
    defaultFile: REGISTRY_DEFAULT_PROMPT_FILE,
    configKey: 'prompts',
  },
  [RegistryItemKind.Tool]: { dirName: TOOLS_DIR, defaultFile: REGISTRY_DEFAULT_TOOL_FILE, configKey: 'tools' },
  [RegistryItemKind.Script]: {
    dirName: SCRIPTS_DIR_NAME,
    defaultFile: REGISTRY_DEFAULT_SCRIPT_FILE,
    configKey: 'scripts',
  },
};

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

export async function fetchRegistryIndex(): Promise<RegistryIndex> {
  const url = `${REGISTRY_BASE_URL}/${REGISTRY_INDEX_FILE}`;
  logger.info(`Fetching registry index from ${url}`);
  const content = await httpsGet(url);
  const rawIndex = JSON.parse(content);
  return RegistryIndexSchema.parse(rawIndex);
}

export function getItemsForKind(index: RegistryIndex, kind: RegistryItemKind): RegistryItemEntry[] {
  const config = KIND_CONFIG[kind];
  return (index[config.configKey] as RegistryItemEntry[] | undefined) ?? [];
}

export async function fetchItemFile(
  kind: RegistryItemKind,
  itemName: string,
  fileName?: string,
): Promise<{ fileName: string; content: string }> {
  const config = KIND_CONFIG[kind];
  const file = fileName ?? config.defaultFile;
  const url = `${REGISTRY_BASE_URL}/${config.dirName}/${itemName}/${file}`;
  logger.info(`Fetching item file from ${url}`);
  const content = await httpsGet(url);
  return { fileName: file, content };
}

export async function fetchItemConfig(
  kind: RegistryItemKind,
  itemName: string,
): Promise<Record<string, unknown> | null> {
  const config = KIND_CONFIG[kind];
  const url = `${REGISTRY_BASE_URL}/${config.dirName}/${itemName}/${REGISTRY_CONFIG_FILE}`;
  try {
    const content = await httpsGet(url);
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getInstalledItems(workspacePath: string, kind: RegistryItemKind): string[] {
  const config = KIND_CONFIG[kind];
  const dirPath = path.join(getConfigDirPathFromWorkspacePath(workspacePath), config.dirName);

  if (!fs.existsSync(dirPath)) return [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => path.parse(e.name).name);
  } catch {
    return [];
  }
}

export async function installItem(
  workspaceFolder: vscode.WorkspaceFolder,
  kind: RegistryItemKind,
  item: RegistryItemEntry,
  force = false,
): Promise<void> {
  const config = KIND_CONFIG[kind];
  const configDirPath = getWorkspaceConfigDirPath(workspaceFolder);
  const targetDir = path.join(configDirPath, config.dirName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { fileName, content } = await fetchItemFile(kind, item.name, item.file);
  const ext = path.extname(fileName);
  const targetFileName = `${item.name}${ext}`;
  const targetPath = path.join(targetDir, targetFileName);

  if (fs.existsSync(targetPath) && !force) {
    throw new Error(`Item "${item.name}" already exists. Use force to overwrite.`);
  }

  fs.writeFileSync(targetPath, content, 'utf8');
  logger.info(`Installed ${kind} "${item.name}" to ${targetPath}`);
}
