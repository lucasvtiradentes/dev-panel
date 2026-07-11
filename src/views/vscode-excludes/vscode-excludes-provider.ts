import { CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { vscodeExcludesState } from '../../common/state';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { ContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { ExcludesProviderBase, FileTypeViewHelper } from '../_view_base';

const FILES_CONFIGURATION_SECTION = 'files';
const FILES_EXCLUDE_KEY = 'exclude';

function getFilesConfiguration() {
  const scope = VscodeHelper.getActiveWorkspaceFolder()?.uri;
  return VscodeHelper.getConfiguration(FILES_CONFIGURATION_SECTION, scope);
}

type VscodeExcludeItem = {
  pattern: string;
  excluded: boolean;
  isDirectory: boolean;
};

export class VscodeExcludeTreeItem extends TreeItemClass {
  constructor(public readonly item: VscodeExcludeItem) {
    super(item.pattern, VscodeConstants.TreeItemCollapsibleState.None);
    this.contextValue = item.excluded ? CONTEXT_VALUES.VSCODE_EXCLUDE_HIDDEN : CONTEXT_VALUES.VSCODE_EXCLUDE_VISIBLE;
    this.iconPath = item.excluded ? VscodeHelper.createCustomIcon(VscodeIcon.EyeClosed) : undefined;
    this.command = {
      command: getCommandId(Command.ToggleVscodeExclude),
      title: item.excluded ? 'Show' : 'Exclude',
      arguments: [this],
    };
  }
}

export class VscodeExcludesProvider extends ExcludesProviderBase {
  constructor() {
    super({
      state: vscodeExcludesState,
      showAllContextKey: ContextKey.VscodeExcludesShowAll,
      groupedContextKey: ContextKey.VscodeExcludesGrouped,
    });
  }

  getChildren(element?: TreeItem): TreeItem[] {
    const groupChildren = this.getGroupChildren(element);
    if (groupChildren) return groupChildren;

    const workspace = VscodeHelper.getActiveWorkspacePath();
    if (!workspace) return [];

    const excludes = VscodeExcludesProvider.getExcludes();
    const rootItems = FileTypeViewHelper.getWorkspaceEntries(workspace).map((entry) => {
      const matchedPattern = Object.hasOwn(excludes, entry.pattern) ? entry.pattern : entry.name;
      return {
        pattern: matchedPattern,
        excluded: excludes[matchedPattern] === true,
        isDirectory: entry.isDirectory,
      };
    });
    const rootPatterns = new Set(rootItems.map((item) => item.pattern));
    const customItems = Object.entries(excludes)
      .filter(([pattern, excluded]) => excluded === true && !rootPatterns.has(pattern))
      .map(([pattern]) => ({ pattern, excluded: true, isDirectory: pattern.endsWith('/') }));
    const items = [...rootItems, ...customItems]
      .filter((item) => this.showAll || item.excluded)
      .sort((left, right) => left.pattern.localeCompare(right.pattern))
      .map((item) => new VscodeExcludeTreeItem(item));
    if (!this.grouped) return items;

    return FileTypeViewHelper.groupItems(items, (item) => item.item.isDirectory);
  }

  static getExcludes(): Record<string, boolean> {
    return getFilesConfiguration().get<Record<string, boolean>>(FILES_EXCLUDE_KEY, {});
  }

  static async toggle(pattern: string, excluded: boolean): Promise<void> {
    const excludes = { ...VscodeExcludesProvider.getExcludes() };
    if (excluded) delete excludes[pattern];
    else excludes[pattern] = true;
    await getFilesConfiguration().update(FILES_EXCLUDE_KEY, excludes, false);
  }

  static async add(pattern: string): Promise<boolean> {
    const cleaned = pattern.trim();
    if (!cleaned) return false;
    const excludes = { ...VscodeExcludesProvider.getExcludes(), [cleaned]: true };
    await getFilesConfiguration().update(FILES_EXCLUDE_KEY, excludes, false);
    return true;
  }
}
