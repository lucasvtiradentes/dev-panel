import { CONTEXT_VALUES, DND_MIME_TYPE_BRANCH_TASKS, getCommandId } from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import { TaskStatus } from '../../common/schemas/types';
import { JsonHelper } from '../../common/utils/helpers/json-helper';
import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { Command } from '../../common/vscode/vscode-commands';
import { VscodeConstants } from '../../common/vscode/vscode-constants';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import { VscodeIcons } from '../../common/vscode/vscode-icons';
import {
  type CancellationToken,
  type DataTransfer,
  type TreeDragAndDropController,
  type TreeItem,
  TreeItemClass,
} from '../../common/vscode/vscode-types';
import type { MilestoneNode, TaskNode } from '../_branch_base';
import { formatTaskDescription, formatTaskTooltip, getStatusIcon } from './task-item-utils';

const logger = createLogger('BranchTasksDnD');

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

export class BranchTaskItem extends TreeItemClass {
  constructor(
    public readonly node: TaskNode,
    hasChildren: boolean,
  ) {
    const label = node.text;
    super(
      label,
      hasChildren ? VscodeConstants.TreeItemCollapsibleState.Expanded : VscodeConstants.TreeItemCollapsibleState.None,
    );

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

export class BranchMilestoneItem extends TreeItemClass {
  constructor(
    public readonly milestone: MilestoneNode,
    public readonly isNoMilestone = false,
  ) {
    super(milestone.name, VscodeConstants.TreeItemCollapsibleState.Expanded);
    this.contextValue = CONTEXT_VALUES.MILESTONE_ITEM;

    const total = this.countTasks(milestone.tasks);
    const done = this.countTasks(milestone.tasks, (t) => t.status === TaskStatus.Done);
    const doing = this.countTasks(milestone.tasks, (t) => t.status === TaskStatus.Doing);
    this.description = `${done}/${total}`;

    this.iconPath = this.getMilestoneIcon(isNoMilestone, total, done, doing);
  }

  private getMilestoneIcon(isNoMilestone: boolean, total: number, done: number, doing: number) {
    if (total > 0 && done === total) {
      return isNoMilestone ? VscodeIcons.InboxCompleted : VscodeIcons.MilestoneCompleted;
    }
    if (doing > 0) {
      return isNoMilestone ? VscodeIcons.InboxInProgress : VscodeIcons.MilestoneInProgress;
    }
    return isNoMilestone ? VscodeIcons.Inbox : VscodeIcons.Milestone;
  }

  private countTasks(tasks: TaskNode[], predicate?: (task: TaskNode) => boolean): number {
    let count = 0;
    for (const task of tasks) {
      if (!predicate || predicate(task)) count++;
      count += this.countTasks(task.children, predicate);
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

export class BranchTasksDragAndDropController implements TreeDragAndDropController<BranchTreeItem> {
  readonly dropMimeTypes = [DND_MIME_TYPE_BRANCH_TASKS];
  readonly dragMimeTypes = [DND_MIME_TYPE_BRANCH_TASKS];

  constructor(private readonly provider: BranchTasksProviderInterface) {}

  handleDrag(source: readonly BranchTreeItem[], dataTransfer: DataTransfer, _token: CancellationToken) {
    const item = source[0];
    if (!item || !(item instanceof BranchTaskItem)) {
      logger.info('[handleDrag] Ignoring drag - not a BranchTaskItem');
      return;
    }

    const data: DragData = {
      type: DragItemType.Task,
      lineIndex: item.node.lineIndex,
      milestoneName: this.provider.findMilestoneForTask(item.node.lineIndex),
    };
    logger.info(`[handleDrag] Dragging task at line ${data.lineIndex}, milestone: ${data.milestoneName}`);
    dataTransfer.set(DND_MIME_TYPE_BRANCH_TASKS, VscodeHelper.createDataTransferItem(JsonHelper.stringify(data)));
  }

  async handleDrop(target: BranchTreeItem | undefined, dataTransfer: DataTransfer, _token: CancellationToken) {
    const transferItem = dataTransfer.get(DND_MIME_TYPE_BRANCH_TASKS);
    if (!transferItem || !target) {
      logger.info('[handleDrop] Ignoring drop - no transfer item or target');
      return;
    }

    let dragData: DragData;
    const parsed = JsonHelper.parse(transferItem.value as string);
    if (!parsed || !TypeGuardsHelper.isObject(parsed) || parsed.type !== DragItemType.Task) {
      logger.info('[handleDrop] Ignoring drop - invalid drag data');
      return;
    }
    dragData = parsed as DragData;
    if (dragData.type !== DragItemType.Task) {
      logger.info('[handleDrop] Ignoring drop - not a task drag');
      return;
    }

    if (target instanceof BranchMilestoneItem) {
      const targetMilestone = target.isNoMilestone ? null : target.milestone.name;
      if (dragData.milestoneName !== targetMilestone) {
        logger.info(
          `[handleDrop] Moving task ${dragData.lineIndex} from milestone "${dragData.milestoneName}" to "${targetMilestone}"`,
        );
        await this.provider.moveTaskToMilestone(dragData.lineIndex, targetMilestone);
      } else {
        logger.info('[handleDrop] Same milestone, ignoring');
      }
    } else if (target instanceof BranchTaskItem) {
      const targetMilestone = this.provider.findMilestoneForTask(target.node.lineIndex);

      if (dragData.milestoneName !== targetMilestone) {
        logger.info(
          `[handleDrop] Moving task ${dragData.lineIndex} from milestone "${dragData.milestoneName}" to "${targetMilestone}"`,
        );
        await this.provider.moveTaskToMilestone(dragData.lineIndex, targetMilestone ?? null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.provider.refresh();
      } else {
        logger.info(`[handleDrop] Reordering task ${dragData.lineIndex} to position of task ${target.node.lineIndex}`);
        await this.provider.reorderTask(dragData.lineIndex, target.node.lineIndex);
      }
    } else {
      logger.info('[handleDrop] Ignoring drop - unknown target type');
    }
  }
}
