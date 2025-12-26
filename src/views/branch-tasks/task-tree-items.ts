import * as vscode from 'vscode';
import { CONTEXT_VALUES, DND_MIME_TYPE_BRANCH_TASKS, getCommandId } from '../../common/constants';
import { Command } from '../../common/lib/vscode-utils';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import type { CancellationToken, DataTransfer, TreeItem } from '../../common/vscode/vscode-types';
import type { MilestoneNode, TaskNode } from '../_branch_base';
import { formatTaskDescription, formatTaskTooltip, getStatusIcon } from './task-item-utils';

export const NO_MILESTONE_NAME = 'No Milestone';

enum DragItemType {
  Task = 'task',
  Milestone = 'milestone',
}

type DragData = {
  type: DragItemType;
  lineIndex: number;
  milestoneName?: string;
};

export class BranchTaskItem extends vscode.TreeItem {
  constructor(
    public readonly node: TaskNode,
    hasChildren: boolean,
  ) {
    const label = node.text;
    super(label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

    if (node.meta.externalUrl || node.meta.externalId) {
      this.contextValue = CONTEXT_VALUES.TODO_ITEM_WITH_EXTERNAL;
    } else {
      this.contextValue = CONTEXT_VALUES.TODO_ITEM;
    }
    this.description = formatTaskDescription(node.meta, node.status);
    this.tooltip = formatTaskTooltip(node.text, node.status, node.meta);

    this.iconPath = getStatusIcon(node.status, node.meta);
    this.command = {
      command: getCommandId(Command.CycleTaskStatus),
      title: 'Cycle Status',
      arguments: [node.lineIndex],
    };
  }
}

export class BranchMilestoneItem extends vscode.TreeItem {
  constructor(
    public readonly milestone: MilestoneNode,
    public readonly isNoMilestone = false,
  ) {
    super(milestone.name, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.MILESTONE_ITEM;
    this.iconPath = isNoMilestone ? VscodeIcons.Inbox : VscodeIcons.Milestone;

    const total = this.countAllTasks(milestone.tasks);
    const done = this.countDoneTasks(milestone.tasks);
    this.description = `${done}/${total}`;
  }

  private countAllTasks(tasks: TaskNode[]): number {
    let count = 0;
    for (const task of tasks) {
      count += 1 + this.countAllTasks(task.children);
    }
    return count;
  }

  private countDoneTasks(tasks: TaskNode[]): number {
    let count = 0;
    for (const task of tasks) {
      if (task.status === 'done') count++;
      count += this.countDoneTasks(task.children);
    }
    return count;
  }
}

export type BranchTreeItem = BranchTaskItem | BranchMilestoneItem | TreeItem;

type BranchTasksProviderInterface = {
  findMilestoneForTask(lineIndex: number): string | undefined;
  moveTaskToMilestone(lineIndex: number, milestoneName: string | null): Promise<void>;
  reorderTask(taskLineIndex: number, targetLineIndex: number): Promise<void>;
  refresh(): void;
};

export class BranchTasksDragAndDropController implements vscode.TreeDragAndDropController<BranchTreeItem> {
  readonly dropMimeTypes = [DND_MIME_TYPE_BRANCH_TASKS];
  readonly dragMimeTypes = [DND_MIME_TYPE_BRANCH_TASKS];

  constructor(private readonly provider: BranchTasksProviderInterface) {}

  handleDrag(source: readonly BranchTreeItem[], dataTransfer: DataTransfer, _token: CancellationToken) {
    const item = source[0];
    if (!item || !(item instanceof BranchTaskItem)) return;

    const data: DragData = {
      type: DragItemType.Task,
      lineIndex: item.node.lineIndex,
      milestoneName: this.provider.findMilestoneForTask(item.node.lineIndex),
    };
    dataTransfer.set(DND_MIME_TYPE_BRANCH_TASKS, new vscode.DataTransferItem(JSON.stringify(data)));
  }

  async handleDrop(target: BranchTreeItem | undefined, dataTransfer: DataTransfer, _token: CancellationToken) {
    const transferItem = dataTransfer.get(DND_MIME_TYPE_BRANCH_TASKS);
    if (!transferItem || !target) return;

    let dragData: DragData;
    try {
      const parsed = JSON.parse(transferItem.value as string);
      if (typeof parsed !== 'object' || parsed === null || parsed.type !== DragItemType.Task) {
        return;
      }
      dragData = parsed as DragData;
    } catch {
      return;
    }
    if (dragData.type !== DragItemType.Task) return;

    if (target instanceof BranchMilestoneItem) {
      const targetMilestone = target.isNoMilestone ? null : target.milestone.name;
      if (dragData.milestoneName !== targetMilestone) {
        await this.provider.moveTaskToMilestone(dragData.lineIndex, targetMilestone);
      }
    } else if (target instanceof BranchTaskItem) {
      const targetMilestone = this.provider.findMilestoneForTask(target.node.lineIndex);

      if (dragData.milestoneName !== targetMilestone) {
        await this.provider.moveTaskToMilestone(dragData.lineIndex, targetMilestone ?? null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.provider.refresh();
      } else {
        await this.provider.reorderTask(dragData.lineIndex, target.node.lineIndex);
      }
    }
  }
}
