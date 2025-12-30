import { readJsoncFile } from 'src/common/utils/functions/read-jsonc-file';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  DEFAULT_EXCLUDES,
  DEFAULT_INCLUDES,
  DESCRIPTION_NOT_SET,
  ToggleLabel,
  VARIABLES_FILE_NAME,
  getCommandId,
} from '../../common/constants';

const ERROR_VARIABLE_COMMAND_FAILED = 'Variable command failed';
import { ConfigManager } from '../../common/core/config-manager';
import { type DevPanelSettings, type DevPanelVariable, VariableKind } from '../../common/schemas';
import { DevPanelConfigSchema } from '../../common/schemas/config-schema';
import { execAsync } from '../../common/utils/functions/exec-async';
import { GroupHelper } from '../../common/utils/helpers/group-helper';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import { type FileSelectionOptions, selectFiles, selectFolders } from '../../common/vscode/vscode-inputs';
import { type TreeDataProvider, type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { getIsGrouped, saveIsGrouped } from './state';

type DevPanelVariables = {
  variables: DevPanelVariable[];
};

type DevPanelState = {
  [key: string]: unknown;
};

function getStatePath(): string | null {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return null;
  return ConfigManager.getConfigFilePathFromWorkspacePath(workspace, VARIABLES_FILE_NAME);
}

function loadState(): DevPanelState {
  const statePath = getStatePath();
  if (!statePath || !FileIOHelper.fileExists(statePath)) return {};
  try {
    const content = FileIOHelper.readFile(statePath);
    const parsed = JSON.parse(content);
    if (!TypeGuardsHelper.isObject(parsed)) {
      return {};
    }
    return parsed as DevPanelState;
  } catch {
    return {};
  }
}

function saveState(state: DevPanelState) {
  const statePath = getStatePath();
  if (!statePath) return;
  FileIOHelper.writeFile(statePath, JSON.stringify(state, null, 2));
}

function formatValue(value: unknown, variable: DevPanelVariable): string {
  if (value === undefined) {
    if (variable.default !== undefined) {
      return formatValue(variable.default, variable);
    }
    return DESCRIPTION_NOT_SET;
  }
  if (TypeGuardsHelper.isBoolean(value)) return value ? ToggleLabel.On : ToggleLabel.Off;
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(none)';
  return String(value);
}

class GroupTreeItem extends TreeItemClass {
  constructor(
    public readonly groupName: string,
    public readonly variables: DevPanelVariable[],
  ) {
    super(groupName, VscodeConstants.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.GROUP_ITEM;
  }
}

export class VariableTreeItem extends TreeItemClass {
  constructor(
    public readonly variable: DevPanelVariable,
    currentValue?: unknown,
  ) {
    super(variable.name, VscodeConstants.TreeItemCollapsibleState.None);
    this.contextValue = CONTEXT_VALUES.VARIABLE_ITEM;
    const value = formatValue(currentValue, variable);
    this.description = value;
    if (variable.description) {
      this.tooltip = variable.description;
    }
    this.command = {
      command: getCommandId(Command.SelectConfigOption),
      title: 'Select Option',
      arguments: [variable],
    };
  }
}

let providerInstance: VariablesProvider | null = null;

export class VariablesProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = VscodeHelper.createEventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _grouped: boolean;

  constructor() {
    providerInstance = this;
    this._grouped = getIsGrouped();
    this.updateContextKeys();
  }

  private updateContextKeys() {
    void setContextKey(ContextKey.ConfigsGrouped, this._grouped);
  }

  toggleGroupMode() {
    this._grouped = !this._grouped;
    saveIsGrouped(this._grouped);
    this.updateContextKeys();
    this._onDidChangeTreeData.fire(undefined);
  }

  // tscanner-ignore-next-line no-empty-function
  dispose() {}

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    const config = this.loadConfig();
    if (!config) return Promise.resolve([]);

    const state = loadState();

    if (element instanceof GroupTreeItem) {
      return Promise.resolve(element.variables.map((v) => new VariableTreeItem(v, state[v.name])));
    }

    if (!this._grouped) {
      return Promise.resolve(config.variables.map((v) => new VariableTreeItem(v, state[v.name])));
    }

    const grouped = GroupHelper.groupItems(config.variables);
    const items: TreeItem[] = [];

    for (const [groupName, variables] of grouped) {
      items.push(new GroupTreeItem(groupName, variables));
    }

    return Promise.resolve(items);
  }

  private loadConfig(): DevPanelVariables | null {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return null;

    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!FileIOHelper.fileExists(configPath)) return null;

    const content = FileIOHelper.readFile(configPath);
    const rawConfig = readJsoncFile(content);
    const validatedConfig = DevPanelConfigSchema.parse(rawConfig);
    return { variables: validatedConfig.variables ?? [] };
  }

  public loadSettings(): DevPanelSettings | undefined {
    const workspace = VscodeHelper.getFirstWorkspacePath();
    if (!workspace) return undefined;

    const configPath = ConfigManager.getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!FileIOHelper.fileExists(configPath)) return undefined;

    const content = FileIOHelper.readFile(configPath);
    const rawConfig = readJsoncFile(content);
    const validatedConfig = DevPanelConfigSchema.parse(rawConfig);
    return validatedConfig.settings;
  }
}

async function runCommand(variable: DevPanelVariable, value: unknown) {
  if (!variable.command) return;

  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return;

  const formattedValue = Array.isArray(value) ? value.join(',') : String(value);
  const command = `${variable.command} "${formattedValue}"`;
  const configDirPath = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Running: ${variable.name}`,
      cancellable: false,
    },
    async () => {
      try {
        await execAsync(command, { cwd: configDirPath, env: process.env });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        void VscodeHelper.showToastMessage(ToastKind.Error, `${ERROR_VARIABLE_COMMAND_FAILED}: ${errorMessage}`);
      }
    },
  );
}

export async function selectVariableOption(variable: DevPanelVariable) {
  const state = loadState();
  let newValue: unknown;

  switch (variable.kind) {
    case VariableKind.Choose: {
      if (variable.multiSelect) {
        const currentValue = (state[variable.name] as string[] | undefined) || [];
        const items = (variable.options || []).map((opt) => ({
          label: opt,
          picked: currentValue.includes(opt),
        }));
        const selected = await VscodeHelper.showQuickPickItems(items, {
          canPickMany: true,
          placeHolder: `Select ${variable.name}`,
        });
        if (!selected) return;
        newValue = selected.map((s) => s.label);
        break;
      }

      const selected = await VscodeHelper.showQuickPick(variable.options || [], {
        placeHolder: `Select ${variable.name}`,
      });
      if (!selected) return;
      newValue = selected;
      break;
    }

    case VariableKind.Input: {
      const currentValue = state[variable.name] as string | undefined;
      const defaultValue = variable.default as string | undefined;
      const input = await VscodeHelper.showInputBox({
        prompt: variable.description || `Enter value for ${variable.name}`,
        value: currentValue || defaultValue || '',
        placeHolder: `Enter ${variable.name}`,
      });
      if (input === undefined) return;
      newValue = input;
      break;
    }

    case VariableKind.Toggle: {
      const currentValue = state[variable.name] as boolean | undefined;
      const defaultValue = variable.default as boolean | undefined;
      const current = currentValue ?? defaultValue ?? false;
      newValue = !current;
      break;
    }

    case VariableKind.File: {
      const workspaceFolder = VscodeHelper.getFirstWorkspaceFolder();
      if (!workspaceFolder) return;

      const settings = providerInstance?.loadSettings();

      const defaultIncludes = [...DEFAULT_INCLUDES];
      let includes = defaultIncludes;
      if (variable.includes && variable.includes.length > 0) {
        includes = [...defaultIncludes, ...variable.includes];
      } else if (settings?.include && settings.include.length > 0) {
        includes = [...defaultIncludes, ...settings.include];
      }

      const defaultExcludes = [...DEFAULT_EXCLUDES];
      let excludes = defaultExcludes;
      if (variable.excludes && variable.excludes.length > 0) {
        excludes = [...defaultExcludes, ...variable.excludes];
      } else if (settings?.exclude && settings.exclude.length > 0) {
        excludes = [...defaultExcludes, ...settings.exclude];
      }

      const options: FileSelectionOptions = {
        label: variable.description || `Select file for ${variable.name}`,
        multiSelect: variable.multiSelect ?? false,
        includes,
        excludes,
      };

      const result = await selectFiles(workspaceFolder, options);
      if (!result) return;
      newValue = result;
      break;
    }

    case VariableKind.Folder: {
      const workspaceFolder = VscodeHelper.getFirstWorkspaceFolder();
      if (!workspaceFolder) return;

      const settings = providerInstance?.loadSettings();

      const defaultIncludes = [...DEFAULT_INCLUDES];
      let includes = defaultIncludes;
      if (variable.includes && variable.includes.length > 0) {
        includes = [...defaultIncludes, ...variable.includes];
      } else if (settings?.include && settings.include.length > 0) {
        includes = [...defaultIncludes, ...settings.include];
      }

      const defaultExcludes = [...DEFAULT_EXCLUDES];
      let excludes = defaultExcludes;
      if (variable.excludes && variable.excludes.length > 0) {
        excludes = [...defaultExcludes, ...variable.excludes];
      } else if (settings?.exclude && settings.exclude.length > 0) {
        excludes = [...defaultExcludes, ...settings.exclude];
      }

      const options: FileSelectionOptions = {
        label: variable.description || `Select folder for ${variable.name}`,
        multiSelect: variable.multiSelect ?? false,
        includes,
        excludes,
      };

      const result = await selectFolders(workspaceFolder, options);
      if (!result) return;
      newValue = result;
      break;
    }
  }

  if (newValue === undefined) return;

  state[variable.name] = newValue;
  saveState(state);
  providerInstance?.refresh();

  await runCommand(variable, newValue);
}

export function resetVariableOption(item: VariableTreeItem) {
  const state = loadState();
  delete state[item.variable.name];
  saveState(state);
  providerInstance?.refresh();
}
