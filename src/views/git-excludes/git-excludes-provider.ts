import { CONTEXT_VALUES, getCommandId } from '../../common/constants';
import { Git } from '../../common/lib/git';
import { gitExcludesState } from '../../common/state';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { ContextKey } from '../../common/vscode/vscode-context';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { type TreeItem, TreeItemClass } from '../../common/vscode/vscode-types';
import { ExcludesProviderBase, FileTypeViewHelper } from '../_view_base';
import { type ExcludeEntry, readExcludeFile } from './file-ops';

export class GitExcludeTreeItem extends TreeItemClass {
  constructor(
    public readonly pattern: string,
    public readonly excluded: boolean,
    public readonly isDirectory: boolean,
    public readonly entry?: ExcludeEntry,
  ) {
    super(pattern, VscodeConstants.TreeItemCollapsibleState.None);
    this.contextValue = excluded ? CONTEXT_VALUES.GIT_EXCLUDE_HIDDEN : CONTEXT_VALUES.GIT_EXCLUDE_VISIBLE;
    this.iconPath = excluded ? VscodeHelper.createCustomIcon(VscodeIcon.EyeClosed) : undefined;
    this.command = {
      command: getCommandId(Command.ToggleExclude),
      title: excluded ? 'Show' : 'Exclude',
      arguments: [this],
    };
  }
}

let providerInstance: GitExcludesProvider | null = null;

export class GitExcludesProvider extends ExcludesProviderBase {
  private _isGitRepo: boolean | null = null;

  constructor() {
    super({
      state: gitExcludesState,
      showAllContextKey: ContextKey.GitExcludesShowAll,
      groupedContextKey: ContextKey.GitExcludesGrouped,
    });
    providerInstance = this;
  }

  private async checkGitRepo(): Promise<boolean> {
    const workspace = VscodeHelper.getActiveWorkspacePath();
    if (!workspace) return false;
    this._isGitRepo = await Git.isRepository(workspace);
    return this._isGitRepo;
  }

  override dispose() {
    super.dispose();
    providerInstance = null;
  }

  override refresh() {
    this._isGitRepo = null;
    super.refresh();
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    const groupChildren = this.getGroupChildren(element);
    if (groupChildren) return groupChildren;

    const workspace = VscodeHelper.getActiveWorkspacePath();
    if (!workspace) return [];
    if (this._isGitRepo === null) await this.checkGitRepo();
    if (!this._isGitRepo) return [];

    const entries = readExcludeFile(workspace);
    const entriesByPattern = new Map(entries.map((entry) => [entry.pattern, entry]));
    const rootItems = FileTypeViewHelper.getWorkspaceEntries(workspace).map((workspaceEntry) => {
      const entry = entriesByPattern.get(workspaceEntry.pattern) ?? entriesByPattern.get(workspaceEntry.name);
      return new GitExcludeTreeItem(
        entry?.pattern ?? workspaceEntry.pattern,
        Boolean(entry),
        workspaceEntry.isDirectory,
        entry,
      );
    });
    const rootPatterns = new Set(rootItems.map((item) => item.pattern));
    const customItems = entries
      .filter((entry) => !rootPatterns.has(entry.pattern))
      .map((entry) => new GitExcludeTreeItem(entry.pattern, true, entry.pattern.endsWith('/'), entry));

    const items = [...rootItems, ...customItems]
      .filter((item) => this.showAll || item.excluded)
      .sort((left, right) => left.pattern.localeCompare(right.pattern));
    if (!this.grouped) return items;

    return FileTypeViewHelper.groupItems(items, (item) => item.isDirectory);
  }
}

export function refreshGitExcludes() {
  providerInstance?.refresh();
}
