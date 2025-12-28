import { PROMPTS_DIR_NAME, TOOLS_DIR } from '../../../common/constants';

const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/lucasvtiradentes/dev-panel/main/registry';
import { ConfigKey } from '../../../common/constants/enums';
import { ConfigManager } from '../../../common/core/config-manager';
import { logger } from '../../../common/lib/logger';
import {
  type RegistryIndex,
  RegistryIndexSchema,
  type RegistryItemEntry,
  RegistryItemKind,
} from '../../../common/schemas';
import { fetchUrl } from '../../../common/utils/functions/fetch-url';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import type { WorkspaceFolder } from '../../../common/vscode/vscode-types';

type RegistryConfigKey = Exclude<ConfigKey, ConfigKey.Tasks>;

type KindConfig = {
  dirName: string;
  defaultFile: string;
  configKey: RegistryConfigKey;
};

const KIND_CONFIG: Record<RegistryItemKind, KindConfig> = {
  [RegistryItemKind.Plugin]: { dirName: 'plugins', defaultFile: 'plugin.ts', configKey: ConfigKey.Plugins },
  [RegistryItemKind.Prompt]: { dirName: PROMPTS_DIR_NAME, defaultFile: 'prompt.md', configKey: ConfigKey.Prompts },
  [RegistryItemKind.Tool]: { dirName: TOOLS_DIR, defaultFile: 'instructions.md', configKey: ConfigKey.Tools },
  [RegistryItemKind.Script]: { dirName: 'scripts', defaultFile: 'script.sh', configKey: ConfigKey.Scripts },
};

export async function fetchRegistryIndex(): Promise<RegistryIndex> {
  const url = `${REGISTRY_BASE_URL}/index.json`;
  logger.info(`Fetching registry index from ${url}`);
  const content = await fetchUrl(url);
  const rawIndex = JSON.parse(content);
  return RegistryIndexSchema.parse(rawIndex);
}

export function getItemsForKind(index: RegistryIndex, kind: RegistryItemKind): RegistryItemEntry[] {
  const config = KIND_CONFIG[kind];
  return (index[config.configKey] as RegistryItemEntry[] | undefined) ?? [];
}

async function fetchItemFile(
  kind: RegistryItemKind,
  itemName: string,
  fileName?: string,
): Promise<{ fileName: string; content: string }> {
  const config = KIND_CONFIG[kind];
  const file = fileName ?? config.defaultFile;
  const url = `${REGISTRY_BASE_URL}/${config.dirName}/${itemName}/${file}`;
  logger.info(`Fetching item file from ${url}`);
  const content = await fetchUrl(url);
  return { fileName: file, content };
}

export function getInstalledItems(workspacePath: string, kind: RegistryItemKind): string[] {
  const config = KIND_CONFIG[kind];
  const dirPath = NodePathHelper.join(ConfigManager.getConfigDirPathFromWorkspacePath(workspacePath), config.dirName);

  if (!FileIOHelper.fileExists(dirPath)) return [];

  try {
    const entries = FileIOHelper.readDirectory(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => NodePathHelper.parse(e.name).name);
  } catch {
    return [];
  }
}

export async function installItem(
  workspaceFolder: WorkspaceFolder,
  kind: RegistryItemKind,
  item: RegistryItemEntry,
  force = false,
) {
  const config = KIND_CONFIG[kind];
  const configDirPath = ConfigManager.getWorkspaceConfigDirPath(workspaceFolder);
  const targetDir = NodePathHelper.join(configDirPath, config.dirName);

  if (!FileIOHelper.fileExists(targetDir)) {
    FileIOHelper.ensureDirectoryExists(targetDir);
  }

  const { fileName, content } = await fetchItemFile(kind, item.name, item.file);
  const ext = NodePathHelper.extname(fileName);
  const targetFileName = `${item.name}${ext}`;
  const targetPath = NodePathHelper.join(targetDir, targetFileName);

  if (FileIOHelper.fileExists(targetPath) && !force) {
    throw new Error(`Item "${item.name}" already exists. Use force to overwrite.`);
  }

  FileIOHelper.writeFile(targetPath, content);
  logger.info(`Installed ${kind} "${item.name}" to ${targetPath}`);
}
