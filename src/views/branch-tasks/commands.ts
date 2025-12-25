import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { TaskPriority, TaskStatus } from '../branch-context/providers/interfaces';
import type { BranchTaskItem, BranchTasksProvider } from './provider';

type ItemOrLineIndex = BranchTaskItem | number;

function extractLineIndex(itemOrLineIndex: ItemOrLineIndex): number {
  return typeof itemOrLineIndex === 'number' ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
}

export function createBranchTaskCommands(provider: BranchTasksProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.SetTaskStatus, async (lineIndex: number) => {
      const status = await pickStatus();
      if (!status) return;
      await provider.setStatus(lineIndex, status);
    }),

    registerCommand(Command.SetTaskStatusTodo, async (lineIndex: number) => {
      await provider.setStatus(lineIndex, 'todo');
    }),

    registerCommand(Command.SetTaskStatusDoing, async (lineIndex: number) => {
      await provider.setStatus(lineIndex, 'doing');
    }),

    registerCommand(Command.SetTaskStatusDone, async (lineIndex: number) => {
      await provider.setStatus(lineIndex, 'done');
    }),

    registerCommand(Command.SetTaskStatusBlocked, async (lineIndex: number) => {
      await provider.setStatus(lineIndex, 'blocked');
    }),

    registerCommand(Command.SetTaskPriority, async (lineIndex: number) => {
      const priority = await pickPriority();
      if (!priority) return;
      await provider.setPriority(lineIndex, priority);
    }),

    registerCommand(Command.SetTaskPriorityUrgent, async (lineIndex: number) => {
      await provider.setPriority(lineIndex, 'urgent');
    }),

    registerCommand(Command.SetTaskPriorityHigh, async (lineIndex: number) => {
      await provider.setPriority(lineIndex, 'high');
    }),

    registerCommand(Command.SetTaskPriorityMedium, async (lineIndex: number) => {
      await provider.setPriority(lineIndex, 'medium');
    }),

    registerCommand(Command.SetTaskPriorityLow, async (lineIndex: number) => {
      await provider.setPriority(lineIndex, 'low');
    }),

    registerCommand(Command.SetTaskPriorityNone, async (lineIndex: number) => {
      await provider.setPriority(lineIndex, 'none');
    }),

    registerCommand(Command.SetTaskAssignee, async (lineIndex: number) => {
      const assignee = await vscode.window.showInputBox({
        prompt: 'Enter assignee name',
        placeHolder: 'e.g., lucas',
      });
      if (assignee === undefined) return;
      await provider.setAssignee(lineIndex, assignee ? assignee : undefined);
    }),

    registerCommand(Command.SetTaskDueDate, async (lineIndex: number) => {
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

    registerCommand(Command.AddSubtask, async (lineIndex: number) => {
      const text = await vscode.window.showInputBox({
        prompt: 'Enter subtask text',
        placeHolder: 'New subtask',
      });
      if (!text) return;
      await provider.addSubtask(lineIndex, text);
    }),

    registerCommand(Command.EditTaskText, async (lineIndex: number) => {
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node) return;

      const text = await vscode.window.showInputBox({
        prompt: 'Edit task text',
        value: node.text,
      });
      if (!text) return;
      await provider.editTaskText(lineIndex, text);
    }),

    registerCommand(Command.DeleteBranchTask, async (lineIndex: number) => {
      const confirm = await vscode.window.showWarningMessage('Delete this task?', { modal: true }, 'Delete');
      if (confirm !== 'Delete') return;
      await provider.deleteTask(lineIndex);
    }),

    registerCommand(Command.CopyTaskText, async (lineIndex: number) => {
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node) return;
      await vscode.env.clipboard.writeText(node.text);
      vscode.window.showInformationMessage('Task text copied');
    }),

    registerCommand(Command.OpenTaskExternal, async (itemOrLineIndex: ItemOrLineIndex) => {
      const lineIndex = extractLineIndex(itemOrLineIndex);
      const node = provider.findNodeByLineIndex(lineIndex);
      if (!node?.meta.externalUrl) return;
      await vscode.env.openExternal(vscode.Uri.parse(node.meta.externalUrl));
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
    '$(circle-large-outline) Todo': 'todo',
    '$(play-circle) Doing': 'doing',
    '$(pass-filled) Done': 'done',
    '$(error) Blocked': 'blocked',
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
    '🔴 Urgent': 'urgent',
    '🟠 High': 'high',
    '🟡 Medium': 'medium',
    '🔵 Low': 'low',
    '○ None': 'none',
  };

  return priorityMap[picked.label];
}
