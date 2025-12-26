import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { TaskPriority, TaskStatus } from '../../common/schemas';
import type { BranchTasksProvider } from './provider';
import type { BranchTaskItem } from './task-tree-items';

type ItemOrLineIndex = BranchTaskItem | number;

function extractLineIndex(itemOrLineIndex: ItemOrLineIndex): number {
  return typeof itemOrLineIndex === 'number' ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
}

export function createBranchTaskCommands(provider: BranchTasksProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.SetTaskStatus, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const status = await pickStatus();
      if (!status) return;
      await provider.setStatus(lineIndex, status);
    }),

    registerCommand(Command.SetTaskStatusTodo, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Todo);
    }),

    registerCommand(Command.SetTaskStatusDoing, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Doing);
    }),

    registerCommand(Command.SetTaskStatusDone, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Done);
    }),

    registerCommand(Command.SetTaskStatusBlocked, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setStatus(lineIndex, TaskStatus.Blocked);
    }),

    registerCommand(Command.SetTaskPriority, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const priority = await pickPriority();
      if (!priority) return;
      await provider.setPriority(lineIndex, priority);
    }),

    registerCommand(Command.SetTaskPriorityUrgent, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.Urgent);
    }),

    registerCommand(Command.SetTaskPriorityHigh, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.High);
    }),

    registerCommand(Command.SetTaskPriorityMedium, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.Medium);
    }),

    registerCommand(Command.SetTaskPriorityLow, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.Low);
    }),

    registerCommand(Command.SetTaskPriorityNone, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      await provider.setPriority(lineIndex, TaskPriority.None);
    }),

    registerCommand(Command.SetTaskAssignee, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const assignee = await vscode.window.showInputBox({
        prompt: 'Enter assignee name',
        placeHolder: 'e.g., lucas',
      });
      if (assignee === undefined) return;
      await provider.setAssignee(lineIndex, assignee ? assignee : undefined);
    }),

    registerCommand(Command.SetTaskDueDate, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const dueDate = await vscode.window.showInputBox({
        prompt: 'Enter due date (YYYY-MM-DD)',
        placeHolder: 'e.g., 2025-01-15',
        validateInput: (value) => {
          if (!value) return null;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return 'Use format YYYY-MM-DD';
          }
          return null;
        },
      });
      if (dueDate === undefined) return;
      await provider.setDueDate(lineIndex, dueDate ? dueDate : undefined);
    }),

    registerCommand(Command.AddSubtask, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const text = await vscode.window.showInputBox({
        prompt: 'Enter subtask text',
        placeHolder: 'New subtask',
      });
      if (!text) return;
      await provider.addSubtask(lineIndex, text);
    }),

    registerCommand(Command.EditTaskText, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node) return;

      const text = await vscode.window.showInputBox({
        prompt: 'Edit task text',
        value: node.text,
      });
      if (!text) return;
      await provider.editTaskText(lineIndex, text);
    }),

    registerCommand(Command.DeleteBranchTask, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const confirm = await vscode.window.showWarningMessage('Delete this task?', { modal: true }, 'Delete');
      if (confirm !== 'Delete') return;
      await provider.deleteTask(lineIndex);
    }),

    registerCommand(Command.CopyTaskText, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node) return;
      await vscode.env.clipboard.writeText(node.text);
      vscode.window.showInformationMessage('Task text copied');
    }),

    registerCommand(Command.OpenTaskExternal, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node?.meta.externalUrl) return;
      await vscode.env.openExternal(vscode.Uri.parse(node.meta.externalUrl));
    }),

    registerCommand(Command.SetTaskMilestone, async (item: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(item);
      const milestones = provider.getMilestoneNames();

      const NEW_MILESTONE = '__new__';
      type MilestoneQuickPickItem = vscode.QuickPickItem & { value: string | null };

      const items: MilestoneQuickPickItem[] = [
        { label: '$(inbox) No Milestone', value: null },
        { label: '$(add) New Milestone...', value: NEW_MILESTONE },
      ];

      if (milestones.length > 0) {
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator, value: null });
        for (const m of milestones) {
          items.push({ label: `$(milestone) ${m}`, value: m });
        }
      }

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Move to milestone',
      });

      if (picked === undefined) return;

      if (picked.value === NEW_MILESTONE) {
        const name = await vscode.window.showInputBox({
          prompt: 'Enter milestone name',
          placeHolder: 'e.g., Sprint 1',
        });
        if (!name) return;
        await provider.createMilestone(name);
        await provider.moveTaskToMilestone(lineIndex, name);
        return;
      }

      await provider.moveTaskToMilestone(lineIndex, picked.value);
    }),
  ];
}

async function pickStatus(): Promise<TaskStatus | undefined> {
  const items: vscode.QuickPickItem[] = [
    { label: '$(circle-large-outline) Todo', description: 'Not started' },
    { label: '$(play-circle) Doing', description: 'In progress' },
    { label: '$(pass-filled) Done', description: 'Completed' },
    { label: '$(error) Blocked', description: 'Blocked by something' },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select status',
  });

  if (!picked) return undefined;

  const statusMap: Record<string, TaskStatus> = {
    '$(circle-large-outline) Todo': TaskStatus.Todo,
    '$(play-circle) Doing': TaskStatus.Doing,
    '$(pass-filled) Done': TaskStatus.Done,
    '$(error) Blocked': TaskStatus.Blocked,
  };

  return statusMap[picked.label];
}

async function pickPriority(): Promise<TaskPriority | undefined> {
  const items: vscode.QuickPickItem[] = [
    { label: '🔴 Urgent', description: 'Critical priority' },
    { label: '🟠 High', description: 'High priority' },
    { label: '🟡 Medium', description: 'Medium priority' },
    { label: '🔵 Low', description: 'Low priority' },
    { label: '○ None', description: 'No priority' },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select priority',
  });

  if (!picked) return undefined;

  const priorityMap: Record<string, TaskPriority> = {
    '🔴 Urgent': TaskPriority.Urgent,
    '🟠 High': TaskPriority.High,
    '🟡 Medium': TaskPriority.Medium,
    '🔵 Low': TaskPriority.Low,
    '○ None': TaskPriority.None,
  };

  return priorityMap[picked.label];
}
