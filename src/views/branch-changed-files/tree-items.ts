import { getCommandId } from '../../common/constants';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeColor, VscodeConstants, VscodeIcon } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { TreeItemClass } from '../../common/vscode/vscode-types';

export type FileStatus = 'A' | 'M' | 'D' | '?';

export type ChangedFileNode = {
  status: FileStatus;
  path: string;
  filename: string;
  added: string;
  deleted: string;
};

export type TopicNode = {
  name: string;
  files: ChangedFileNode[];
  isUserCreated: boolean;
};

const STATUS_ICONS: Record<FileStatus, { icon: VscodeIcon; color: VscodeColor }> = {
  A: { icon: VscodeIcon.FileAdd, color: VscodeColor.ChartsGreen },
  M: { icon: VscodeIcon.Diff, color: VscodeColor.ChartsBlue },
  D: { icon: VscodeIcon.Close, color: VscodeColor.ChartsRed },
  '?': { icon: VscodeIcon.FileAdd, color: VscodeColor.ChartsGreen },
};

export class ChangedFileItem extends TreeItemClass {
  constructor(public readonly node: ChangedFileNode) {
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
  constructor(public readonly topic: TopicNode) {
    super(topic.name, VscodeConstants.TreeItemCollapsibleState.Expanded);

    this.iconPath = VscodeHelper.createIcon(VscodeIcon.Folder);
    this.description = `${topic.files.length} files`;
    this.contextValue = 'topicGroupItem';
  }
}

export type BranchChangedFilesTreeItem = ChangedFileItem | TopicGroupItem;
