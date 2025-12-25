import { execSync } from 'node:child_process';
import type {
  SyncResult,
  TaskMeta,
  TaskNode,
  TaskPriority,
  TaskStatus,
} from '../../src/views/branch-context/providers/interfaces';
import { getPluginRequest, runPlugin } from './task-plugin-base';

const CONSTANTS = {
  EXEC_TIMEOUT: 30000,
  ENCODING: 'utf-8' as const,
};

type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state?: {
    name: string;
    type: string;
  };
  priority?: number;
  assignee?: {
    name: string;
    email: string;
  };
  labels?: { name: string }[];
  dueDate?: string;
  estimate?: number;
  parent?: {
    identifier: string;
  };
  children?: LinearIssue[];
  url: string;
};

type LinearState = {
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
};

function safeExecLinear(args: string): string | null {
  try {
    return execSync(`linear ${args}`, {
      encoding: CONSTANTS.ENCODING,
      timeout: CONSTANTS.EXEC_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

function execLinear(args: string): string {
  const result = safeExecLinear(args);
  if (result === null) {
    throw new Error('Linear CLI error');
  }
  return result;
}

function parseJsonOutput(output: string): unknown {
  const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON in output');
  }
  return JSON.parse(jsonMatch[0]);
}

function mapLinearStateToStatus(state?: LinearState, customMapping?: Record<string, TaskStatus>): TaskStatus {
  if (!state) return 'todo';

  if (customMapping?.[state.name]) {
    return customMapping[state.name];
  }

  switch (state.type) {
    case 'completed':
    case 'canceled':
      return 'done';
    case 'started':
      return 'doing';
    default:
      return 'todo';
  }
}

function mapStatusToLinearState(status: TaskStatus): string {
  switch (status) {
    case 'done':
      return 'Done';
    case 'doing':
      return 'In Progress';
    case 'blocked':
    case 'todo':
      return 'Todo';
  }
}

function mapLinearPriority(priority?: number): TaskPriority {
  switch (priority) {
    case 1:
      return 'urgent';
    case 2:
      return 'high';
    case 3:
      return 'medium';
    case 4:
      return 'low';
    default:
      return 'none';
  }
}

function mapPriorityToLinear(priority?: TaskPriority): number | undefined {
  switch (priority) {
    case 'urgent':
      return 1;
    case 'high':
      return 2;
    case 'medium':
      return 3;
    case 'low':
      return 4;
    default:
      return undefined;
  }
}

function linearIssueToTaskNode(
  issue: LinearIssue,
  index: number,
  customStateMapping?: Record<string, TaskStatus>,
): TaskNode {
  const meta: TaskMeta = {
    priority: mapLinearPriority(issue.priority),
    externalId: issue.identifier,
    externalUrl: issue.url,
  };

  if (issue.assignee?.name) {
    meta.assignee = issue.assignee.name;
  }

  if (issue.dueDate) {
    meta.dueDate = issue.dueDate;
  }

  if (issue.labels && issue.labels.length > 0) {
    meta.tags = issue.labels.map((l) => l.name);
  }

  if (issue.estimate) {
    meta.estimate = `${issue.estimate}pt`;
  }

  const children = (issue.children ?? []).map((child, i) => linearIssueToTaskNode(child, i, customStateMapping));

  return {
    text: issue.title,
    status: mapLinearStateToStatus(issue.state as LinearState | undefined, customStateMapping),
    lineIndex: index,
    children,
    meta,
  };
}

function parseLinearLink(linearLink: string): string | null {
  const issueMatch = linearLink.match(/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/);
  return issueMatch ? issueMatch[1] : null;
}

const request = getPluginRequest();
const linearLink = request.context.branchContext?.linearLink as string | undefined;

if (!linearLink || linearLink === 'N/A' || linearLink.trim() === '') {
  console.log(JSON.stringify({ success: true, tasks: [] }));
  process.exit(0);
}

const parentIssueId = parseLinearLink(linearLink);

if (!parentIssueId) {
  console.log(JSON.stringify({ success: false, error: 'Invalid Linear link format' }));
  process.exit(1);
}

const options = (request.context.sectionOptions ?? {}) as Record<string, unknown>;
const includeCompleted = (options.includeCompleted as boolean) ?? false;
const customStateMapping = options.stateMapping as Record<string, TaskStatus> | undefined;

const taskCache = new Map<number, string>();

runPlugin({
  async getTasks(): Promise<TaskNode[]> {
    let filter = `--parent ${parentIssueId}`;
    if (!includeCompleted) {
      filter += ' --state "!Done" --state "!Canceled"';
    }

    const output = safeExecLinear(`issue list ${filter} --format json`);

    if (!output) {
      return [];
    }

    try {
      const parsed = parseJsonOutput(output);
      const issues = Array.isArray(parsed) ? parsed : [];

      const tasks = (issues as LinearIssue[]).map((issue, index) => {
        taskCache.set(index, issue.identifier);
        return linearIssueToTaskNode(issue, index, customStateMapping);
      });

      return tasks;
    } catch {
      return [];
    }
  },

  async setStatus(lineIndex: number, newStatus: TaskStatus): Promise<void> {
    const issueId = taskCache.get(lineIndex);
    if (!issueId) {
      throw new Error(`No issue found for lineIndex ${lineIndex}`);
    }

    const linearState = mapStatusToLinearState(newStatus);
    execLinear(`issue update ${issueId} --state "${linearState}"`);
  },

  async createTask(text: string, _parentIndex?: number): Promise<TaskNode> {
    const escapedText = text.replace(/"/g, '\\"');
    const output = execLinear(`issue create --title "${escapedText}" --parent ${parentIssueId} --format json`);

    const issue = parseJsonOutput(output) as LinearIssue;
    const index = taskCache.size;
    taskCache.set(index, issue.identifier);

    return linearIssueToTaskNode(issue, index, customStateMapping);
  },

  async updateMeta(lineIndex: number, meta: Partial<TaskMeta>): Promise<void> {
    const issueId = taskCache.get(lineIndex);
    if (!issueId) {
      throw new Error(`No issue found for lineIndex ${lineIndex}`);
    }

    const args: string[] = [];

    if (meta.priority !== undefined) {
      const linearPriority = mapPriorityToLinear(meta.priority);
      if (linearPriority !== undefined) {
        args.push(`--priority ${linearPriority}`);
      }
    }

    if (meta.assignee !== undefined) {
      args.push(`--assignee "${meta.assignee}"`);
    }

    if (meta.dueDate !== undefined) {
      args.push(`--due-date "${meta.dueDate}"`);
    }

    if (args.length > 0) {
      execLinear(`issue update ${issueId} ${args.join(' ')}`);
    }
  },

  async deleteTask(lineIndex: number): Promise<void> {
    const issueId = taskCache.get(lineIndex);
    if (!issueId) {
      throw new Error(`No issue found for lineIndex ${lineIndex}`);
    }

    execLinear(`issue update ${issueId} --state "Canceled"`);
  },

  async sync(): Promise<SyncResult> {
    let filter = `--parent ${parentIssueId}`;
    if (!includeCompleted) {
      filter += ' --state "!Done" --state "!Canceled"';
    }

    const output = safeExecLinear(`issue list ${filter} --format json`);

    if (!output) {
      return { added: 0, updated: 0, deleted: 0 };
    }

    try {
      const parsed = parseJsonOutput(output);
      const issues = Array.isArray(parsed) ? (parsed as LinearIssue[]) : [];

      taskCache.clear();
      issues.forEach((issue, index) => {
        taskCache.set(index, issue.identifier);
      });

      return {
        added: 0,
        updated: issues.length,
        deleted: 0,
      };
    } catch {
      return { added: 0, updated: 0, deleted: 0 };
    }
  },
});
