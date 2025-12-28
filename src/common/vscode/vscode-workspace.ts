import { IS_DEV } from '../constants/constants';
import { CONTEXT_PREFIX, DEV_SUFFIX } from '../constants/scripts-constants';
import { VscodeHelper } from './vscode-helper';

export function isMultiRootWorkspace(): boolean {
  const folders = VscodeHelper.getWorkspaceFolders();
  return folders.length > 1;
}

export function generateWorkspaceId(): string {
  const folders = VscodeHelper.getWorkspaceFolders();
  if (folders.length === 0) return '';
  const paths = folders
    .map((f) => f.uri.fsPath)
    .sort()
    .join('|');
  let hash = 0;
  for (let i = 0; i < paths.length; i++) {
    const char = paths.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

let currentWorkspaceId = '';
export function getWorkspaceId(): string {
  return currentWorkspaceId;
}
export function setWorkspaceId(id: string) {
  currentWorkspaceId = id;
}

export function buildWorkspaceWhenClause(workspaceId: string): string {
  return `${CONTEXT_PREFIX}.workspaceId == '${workspaceId}'`;
}

export enum ExtensionConfigKey {
  AutoRefresh = 'autorefresh',
}

type ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: boolean;
};

const extensionConfigDefaults: ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: true,
};

function getExtensionConfigSection(): string {
  return IS_DEV ? `${CONTEXT_PREFIX}${DEV_SUFFIX}` : CONTEXT_PREFIX;
}

export function getExtensionConfig<K extends ExtensionConfigKey>(key: K): ExtensionConfigSchema[K] {
  const config = VscodeHelper.getConfiguration(getExtensionConfigSection());
  return config.get<ExtensionConfigSchema[K]>(key) ?? extensionConfigDefaults[key];
}
