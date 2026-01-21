import { GitFileStatus, getCommandId } from '../../common/constants';
import type { ChangedFile, ChangedFilesTopic, FileStatus } from '../../common/core';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeColor, VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { TreeItemClass } from '../../common/vscode/vscode-types';

export type { ChangedFile as ChangedFileNode, ChangedFilesTopic as TopicNode, FileStatus };

const STATUS_ICONS: Record<FileStatus, { icon: VscodeIcon; color: VscodeColor }> = {
  [GitFileStatus.Added]: { icon: VscodeIcon.FileAdd, color: VscodeColor.ChartsGreen },
  [GitFileStatus.Modified]: { icon: VscodeIcon.Diff, color: VscodeColor.ChartsBlue },
  [GitFileStatus.Deleted]: { icon: VscodeIcon.Close, color: VscodeColor.ChartsRed },
  [GitFileStatus.Renamed]: { icon: VscodeIcon.ArrowUp, color: VscodeColor.ChartsPurple },
  [GitFileStatus.Copied]: { icon: VscodeIcon.FileAdd, color: VscodeColor.ChartsGreen },
  '?': { icon: VscodeIcon.FileAdd, color: VscodeColor.ChartsGreen },
};

export class ChangedFileItem extends TreeItemClass {
  constructor(public readonly node: ChangedFile) {
    super(node.filename, VscodeConstants.TreeItemCollapsibleState.None);

    const { icon, color } = STATUS_ICONS[node.status] ?? STATUS_ICONS.M;
    this.iconPath = VscodeHelper.createIcon(icon, color);

    this.description = `(${node.added} ${node.deleted})`;
    this.tooltip = `${node.path}\nClick to view diff\n${node.added} ${node.deleted}`;
    this.contextValue = 'changedFileItem';

    this.command = {
      command: getCommandId(Command.OpenChangedFileDiff),
      title: 'Open Diff',
      arguments: [node.path, node.status],
    };
  }
}

export class TopicGroupItem extends TreeItemClass {
  constructor(public readonly topic: ChangedFilesTopic) {
    super(topic.name, VscodeConstants.TreeItemCollapsibleState.Expanded);

    this.iconPath = VscodeHelper.createIcon(VscodeIcon.Folder);
    this.description = `${topic.files.length} files`;
    this.contextValue = 'topicGroupItem';
  }
}

export type BranchChangedFilesTreeItem = ChangedFileItem | TopicGroupItem;
