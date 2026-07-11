import { readJsoncFile } from 'src/common/utils/functions/read-jsonc-file';
import {
  CONFIG_FILE_NAME,
  CONTEXT_VALUES,
  DESCRIPTION_NOT_SET,
  ToggleLabel,
  getCommandId,
} from '../../common/constants';

const ERROR_VARIABLE_COMMAND_FAILED = 'Variable command failed';
import { ConfigManager } from '../../common/core/config-manager';
import { type DevPanelVariable, InputType } from '../../common/schemas';
import { DevPanelConfigSchema } from '../../common/schemas/config-schema';
import { execAsync } from '../../common/utils/functions/exec-async';
import { GroupHelper } from '../../common/utils/helpers/group-helper';
import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { VariablesHelper, type VariablesState } from '../../common/utils/helpers/variables-helper';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { ContextKey, setContextKey } from '../../common/vscode/vscode-context';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import { type InputValue, collectInputValue } from '../../common/vscode/vscode-inputs';
import { type TreeDataProvider, type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { getVariableKeybinding } from './keybindings-local';
import { getIsGrouped, saveIsGrouped } from './state';

type DevPanelVariables = {
  variables: DevPanelVariable[];
};

type DevPanelState = VariablesState;

export function loadVariablesState(): DevPanelState {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return {};
  return VariablesHelper.load(workspace);
}

function saveState(state: DevPanelState) {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return;
  VariablesHelper.save(workspace, state);
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
    const keybinding = getVariableKeybinding(variable.name);
    this.description = keybinding ? `${value} | ${keybinding}` : value;
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

  reloadWorkspaceState() {
    this._grouped = getIsGrouped();
    this.updateContextKeys();
    this.refresh();
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

    const state = loadVariablesState();

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
}

async function runCommand(variable: DevPanelVariable, value: unknown) {
  if (!variable.command) return;

  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return;

  const formattedValue = Array.isArray(value) ? value.join(',') : String(value);
  const resolvedCmd = variable.command.replace(/\$\{workspaceFolder\}/g, workspace);
  const command = `${resolvedCmd} "${formattedValue}"`;
  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Running: ${variable.name}`,
      cancellable: false,
    },
    async () => {
      try {
        await execAsync(command, { cwd: workspace, env: process.env });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        void VscodeHelper.showToastMessage(ToastKind.Error, `${ERROR_VARIABLE_COMMAND_FAILED}: ${errorMessage}`);
      }
    },
  );
}

export async function selectVariableOption(variable: DevPanelVariable) {
  const state = loadVariablesState();
  const workspaceFolder = VscodeHelper.getFirstWorkspaceFolder();
  if (!workspaceFolder) return;

  const currentValue = state[variable.name] as InputValue | undefined;
  const newValue = await collectInputValue(variable, workspaceFolder, {
    currentValue,
    booleanMode: variable.type === InputType.Boolean ? 'toggle' : 'prompt',
  });
  if (newValue === undefined) return;

  state[variable.name] = newValue;
  saveState(state);
  providerInstance?.refresh();

  await runCommand(variable, newValue);
}

export function resetVariableOption(item: VariableTreeItem) {
  const state = loadVariablesState();
  delete state[item.variable.name];
  saveState(state);
  providerInstance?.refresh();
}
