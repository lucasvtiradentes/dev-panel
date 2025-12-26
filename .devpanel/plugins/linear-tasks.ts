import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPluginRequest, runPlugin } from './task-plugin-base';

enum TaskStatus {
  Todo = 'todo',
  Doing = 'doing',
  Done = 'done',
  Blocked = 'blocked',
}

enum TaskPriority {
  Urgent = 'urgent',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  None = 'none',
}

type TaskMeta = {
  assignee?: string;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string;
  estimate?: string;
  externalId?: string;
  externalUrl?: string;
};

type TaskNode = {
  text: string;
  status: TaskStatus;
  lineIndex: number;
  children: TaskNode[];
  meta: TaskMeta;
};

type SyncResult = {
  added: number;
  updated: number;
  deleted: number;
  conflicts?: { taskId: string; reason: string }[];
};

const LOG_FILE = join(tmpdir(), 'dev-panel-dev.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `[${timestamp}] [linear-tasks    ] [DEBUG] ${message}\n`);
}

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
  url: string;
  subIssues?: {
    identifier: string;
    title: string;
    completed: boolean;
  }[];
};

enum LinearStateType {
  Backlog = 'backlog',
  Unstarted = 'unstarted',
  Started = 'started',
  Completed = 'completed',
  Canceled = 'canceled',
}

type LinearState = {
  name: string;
  type: LinearStateType;
};

enum LinkKind {
  Issue = 'issue',
  Project = 'project',
}

type ParsedLink = {
  kind: LinkKind;
  id: string;
};

function safeExecLinear(args: string): string | null {
  try {
    return execSync(`linear ${args}`, {
      encoding: CONSTANTS.ENCODING,
      timeout: CONSTANTS.EXEC_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    log(`safeExecLinear error: ${err}`);
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

function parseLinearLink(linearLink: string): ParsedLink | null {
  const issueMatch = linearLink.match(/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/);
  if (issueMatch) {
    return { kind: LinkKind.Issue, id: issueMatch[1] };
  }

  const projectMatch = linearLink.match(/linear\.app\/[^/]+\/project\/([a-zA-Z0-9-]+)/);
  if (projectMatch) {
    return { kind: LinkKind.Project, id: projectMatch[1] };
  }

  return null;
}

function mapLinearStateToStatus(state?: LinearState, customMapping?: Record<string, TaskStatus>): TaskStatus {
  if (!state) return TaskStatus.Todo;

  if (customMapping?.[state.name]) {
    return customMapping[state.name];
  }

  switch (state.type) {
    case LinearStateType.Completed:
    case LinearStateType.Canceled:
      return TaskStatus.Done;
    case LinearStateType.Started:
      return TaskStatus.Doing;
    default:
      return TaskStatus.Todo;
  }
}

function mapStatusToLinearState(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Done:
      return 'Done';
    case TaskStatus.Doing:
      return 'In Progress';
    case TaskStatus.Blocked:
    case TaskStatus.Todo:
      return 'Todo';
  }
}

function mapLinearPriority(priority?: number): TaskPriority {
  switch (priority) {
    case 1:
      return TaskPriority.Urgent;
    case 2:
      return TaskPriority.High;
    case 3:
      return TaskPriority.Medium;
    case 4:
      return TaskPriority.Low;
    default:
      return TaskPriority.None;
  }
}

function mapPriorityToLinear(priority?: TaskPriority): number | undefined {
  switch (priority) {
    case TaskPriority.Urgent:
      return 1;
    case TaskPriority.High:
      return 2;
    case TaskPriority.Medium:
      return 3;
    case TaskPriority.Low:
      return 4;
    case TaskPriority.None:
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

  return {
    text: issue.title,
    status: mapLinearStateToStatus(issue.state as LinearState | undefined, customStateMapping),
    lineIndex: index,
    children: [],
    meta,
  };
}

function subIssueToTaskNode(
  subIssue: { identifier: string; title: string; completed: boolean },
  index: number,
): TaskNode {
  return {
    text: subIssue.title,
    status: subIssue.completed ? TaskStatus.Done : TaskStatus.Todo,
    lineIndex: index,
    children: [],
    meta: {
      externalId: subIssue.identifier,
      priority: TaskPriority.None,
    },
  };
}

const request = getPluginRequest();
const linearLink = request.context.branchContext?.linearLink as string | undefined;

log(`linearLink received: "${linearLink}"`);

if (!linearLink || linearLink === 'N/A' || linearLink.trim() === '') {
  log('No valid linearLink, returning empty tasks');
  console.log(JSON.stringify({ success: true, tasks: [] }));
  process.exit(0);
}

const parsed = parseLinearLink(linearLink);

log(`parsed result: ${JSON.stringify(parsed)}`);

if (!parsed) {
  log('Failed to parse linear link');
  console.log(JSON.stringify({ success: false, error: 'Invalid Linear link format' }));
  process.exit(1);
}

const linkKind = parsed.kind;
const linkId = parsed.id;

log(`linkKind: ${linkKind}, linkId: ${linkId}`);

const options = (request.context.sectionOptions ?? {}) as Record<string, unknown>;
const includeCompleted = (options.includeCompleted as boolean) ?? false;
const customStateMapping = options.stateMapping as Record<string, TaskStatus> | undefined;

const taskCache = new Map<number, string>();

function ensureTaskCache() {
  if (taskCache.size > 0) return;

  log('ensureTaskCache: rebuilding cache');

  if (linkKind === LinkKind.Project) {
    let issues = fetchProjectIssues();
    if (!includeCompleted) {
      issues = issues.filter((issue) => {
        const stateType = issue.state?.type;
        return stateType !== LinearStateType.Completed && stateType !== LinearStateType.Canceled;
      });
    }
    issues.forEach((issue, index) => {
      taskCache.set(index, issue.identifier);
    });
  } else {
    let subIssues = fetchIssueSubIssues();
    if (!includeCompleted) {
      subIssues = subIssues.filter((s) => !s.completed);
    }
    subIssues.forEach((subIssue, index) => {
      taskCache.set(index, subIssue.identifier);
    });
  }

  log(`ensureTaskCache: cache has ${taskCache.size} entries`);
}

function fetchProjectIssues(): LinearIssue[] {
  const cmd = `project issues ${linkId} --format json`;
  log(`fetchProjectIssues: executing "linear ${cmd}"`);

  const output = safeExecLinear(cmd);
  log(`fetchProjectIssues: output is ${output === null ? 'null' : `${output.length} chars`}`);

  if (!output) {
    log('fetchProjectIssues: no output, returning []');
    return [];
  }

  try {
    const jsonData = parseJsonOutput(output);
    const issues = Array.isArray(jsonData) ? (jsonData as LinearIssue[]) : [];
    log(`fetchProjectIssues: parsed ${issues.length} issues`);
    return issues;
  } catch (err) {
    log(`fetchProjectIssues: parse error: ${err}`);
    return [];
  }
}

function fetchIssueSubIssues(): { identifier: string; title: string; completed: boolean }[] {
  const output = safeExecLinear(`issue show ${linkId} --format json`);
  if (!output) return [];

  try {
    const jsonData = parseJsonOutput(output) as LinearIssue;
    return jsonData.subIssues ?? [];
  } catch {
    return [];
  }
}

runPlugin({
  async getTasks(): Promise<TaskNode[]> {
    log(`getTasks called, linkKind: ${linkKind}`);
    taskCache.clear();

    if (linkKind === LinkKind.Project) {
      let issues = fetchProjectIssues();
      log(`getTasks: fetched ${issues.length} issues before filter`);

      if (!includeCompleted) {
        issues = issues.filter((issue) => {
          const stateType = issue.state?.type;
          return stateType !== LinearStateType.Completed && stateType !== LinearStateType.Canceled;
        });
        log(`getTasks: ${issues.length} issues after filter`);
      }

      const tasks = issues.map((issue, index) => {
        taskCache.set(index, issue.identifier);
        return linearIssueToTaskNode(issue, index, customStateMapping);
      });
      log(`getTasks: returning ${tasks.length} tasks`);
      return tasks;
    }

    const subIssues = fetchIssueSubIssues();
    log(`getTasks: fetched ${subIssues.length} subIssues`);

    let filtered = subIssues;
    if (!includeCompleted) {
      filtered = subIssues.filter((s) => !s.completed);
    }

    return filtered.map((subIssue, index) => {
      taskCache.set(index, subIssue.identifier);
      return subIssueToTaskNode(subIssue, index);
    });
  },

  setStatus(lineIndex: number, newStatus: TaskStatus) {
    try {
      ensureTaskCache();
      const issueId = taskCache.get(lineIndex);
      if (!issueId) {
        throw new Error(`No issue found for lineIndex ${lineIndex}`);
      }

      const linearState = mapStatusToLinearState(newStatus);
      execLinear(`issue update ${issueId} --state "${linearState}"`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },

  async createTask(text: string, _parentIndex?: number): Promise<TaskNode> {
    if (linkKind === LinkKind.Issue) {
      throw new Error('Creating sub-issues is not supported via Linear CLI');
    }

    const escapedText = text.replace(/"/g, '\\"');
    const output = execLinear(`issue create --title "${escapedText}" --project "${linkId}" --format json`);

    const issue = parseJsonOutput(output) as LinearIssue;
    const index = taskCache.size;
    taskCache.set(index, issue.identifier);

    return linearIssueToTaskNode(issue, index, customStateMapping);
  },

  updateMeta(lineIndex: number, meta: Partial<TaskMeta>) {
    try {
      ensureTaskCache();
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
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },

  deleteTask(lineIndex: number) {
    try {
      ensureTaskCache();
      const issueId = taskCache.get(lineIndex);
      if (!issueId) {
        throw new Error(`No issue found for lineIndex ${lineIndex}`);
      }

      execLinear(`issue update ${issueId} --state "Canceled"`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },

  sync(): Promise<SyncResult> {
    taskCache.clear();

    if (linkKind === LinkKind.Project) {
      let issues = fetchProjectIssues();

      if (!includeCompleted) {
        issues = issues.filter((issue) => {
          const stateType = issue.state?.type;
          return stateType !== LinearStateType.Completed && stateType !== LinearStateType.Canceled;
        });
      }

      issues.forEach((issue, index) => {
        taskCache.set(index, issue.identifier);
      });

      return Promise.resolve({
        added: 0,
        updated: issues.length,
        deleted: 0,
      });
    }

    const subIssues = fetchIssueSubIssues();

    let filtered = subIssues;
    if (!includeCompleted) {
      filtered = subIssues.filter((s) => !s.completed);
    }

    filtered.forEach((subIssue, index) => {
      taskCache.set(index, subIssue.identifier);
    });

    return Promise.resolve({
      added: 0,
      updated: filtered.length,
      deleted: 0,
    });
  },
});
