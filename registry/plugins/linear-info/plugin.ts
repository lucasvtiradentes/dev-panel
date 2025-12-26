import { execSync } from 'node:child_process';

const CONSTANTS = {
  EXEC_TIMEOUT: 30000,
  ENCODING: 'utf-8' as const,
  UNKNOWN_AUTHOR: 'unknown',
  UNKNOWN_STATE: 'unknown',
  PRIORITY_NONE: 'none',
};

type PluginContext = {
  branchContext: {
    linearLink: string;
  };
};

type LinearLabel = string | { name?: string };

type LinearComment = {
  user?: {
    name?: string;
    email?: string;
  };
  createdAt?: string;
  body?: string;
};

type LinearIssue = {
  title?: string;
  state?: {
    name?: string;
  };
  priority?: string;
  assignee?: string | { name?: string; email?: string };
  labels?: LinearLabel[];
  description?: string;
  comments?: LinearComment[];
};

type LinearProject = {
  name?: string;
  description?: string;
  state?: string;
  lead?: {
    name?: string;
    email?: string;
  };
  progress?: number;
  startDate?: string;
  targetDate?: string;
};

type LinkKind = 'issue' | 'project';

type ParsedLink = {
  kind: LinkKind;
  id: string;
};

type Metadata = {
  kind?: LinkKind;
  state?: string;
  priority?: string;
  commentsCount?: number;
  isEmpty: boolean;
  description: string;
};

function getPluginContext(): PluginContext {
  return JSON.parse(process.env.PLUGIN_CONTEXT ?? '{}');
}

function isValidLink(link: string): boolean {
  return !!(link && link !== 'N/A' && link.trim() !== '');
}

function parseLinearLink(linearLink: string): ParsedLink | null {
  const issueMatch = linearLink.match(/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/);
  if (issueMatch) {
    return { kind: 'issue', id: issueMatch[1] };
  }

  const projectMatch = linearLink.match(/linear\.app\/[^/]+\/project\/([a-zA-Z0-9-]+)/);
  if (projectMatch) {
    return { kind: 'project', id: projectMatch[1] };
  }

  return null;
}

function outputWithMetadata(content: string, metadata: Metadata) {
  console.log(`${content}\n`);
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
}

function fetchLinearIssue(issueId: string): LinearIssue | null {
  try {
    const result = execSync(`linear issue show ${issueId} --format json 2>/dev/null`, {
      encoding: CONSTANTS.ENCODING,
      timeout: CONSTANTS.EXEC_TIMEOUT,
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function fetchLinearProject(projectId: string): LinearProject | null {
  try {
    const result = execSync(`linear project show ${projectId} --format json 2>/dev/null`, {
      encoding: CONSTANTS.ENCODING,
      timeout: CONSTANTS.EXEC_TIMEOUT,
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function formatIssueDetails(data: LinearIssue): string[] {
  const lines: string[] = [];

  if (data.title) lines.push(`Title: ${data.title}`);
  if (data.state?.name) lines.push(`State: ${data.state.name}`);
  if (data.priority) lines.push(`Priority: ${data.priority}`);

  if (data.assignee) {
    const assigneeName =
      typeof data.assignee === 'string' ? data.assignee : (data.assignee.name ?? data.assignee.email);
    if (assigneeName) lines.push(`Assignee: ${assigneeName}`);
  }

  if (data.labels?.length) {
    const labelNames = data.labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean);
    if (labelNames.length) lines.push(`Labels: ${labelNames.join(', ')}`);
  }

  if (data.description) lines.push(`\nDescription:\n${data.description}`);

  return lines;
}

function formatProjectDetails(data: LinearProject): string[] {
  const lines: string[] = [];

  if (data.name) lines.push(`Name: ${data.name}`);
  if (data.state) lines.push(`State: ${data.state}`);
  if (data.lead) {
    const leadName = data.lead.name ?? data.lead.email;
    if (leadName) lines.push(`Lead: ${leadName}`);
  }
  if (data.progress !== undefined) lines.push(`Progress: ${Math.round(data.progress * 100)}%`);
  if (data.startDate) lines.push(`Start: ${new Date(data.startDate).toLocaleDateString()}`);
  if (data.targetDate) lines.push(`Target: ${new Date(data.targetDate).toLocaleDateString()}`);

  if (data.description) lines.push(`\nDescription:\n${data.description}`);

  return lines;
}

function formatIssueComments(comments: LinearComment[]): string[] {
  if (!comments || comments.length === 0) return [];

  const lines: string[] = [`\nComments (${comments.length}):`];

  for (const comment of comments) {
    const author = comment.user?.name ?? comment.user?.email ?? CONSTANTS.UNKNOWN_AUTHOR;
    const date = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : '';
    const body = comment.body ?? '';
    lines.push(`\n@${author} (${date}):\n${body}`);
  }

  return lines;
}

function handleIssue(issueId: string) {
  const data = fetchLinearIssue(issueId);
  if (!data) {
    outputWithMetadata('Issue not found or not accessible', { isEmpty: true, description: 'Error' });
    process.exit(0);
  }

  const lines: string[] = [];
  lines.push(...formatIssueDetails(data));

  const comments = data.comments ?? [];
  lines.push(...formatIssueComments(comments));

  const state = data.state?.name ?? CONSTANTS.UNKNOWN_STATE;
  const commentsCount = comments.length;
  const description = `${state} · ${commentsCount} comments`;
  const metadata: Metadata = {
    kind: 'issue',
    state,
    priority: data.priority ?? CONSTANTS.PRIORITY_NONE,
    commentsCount,
    isEmpty: false,
    description,
  };

  const content = lines.length > 0 ? lines.join('\n') : 'No issue details available';
  outputWithMetadata(content, metadata);
}

function handleProject(projectId: string) {
  const data = fetchLinearProject(projectId);
  if (!data) {
    outputWithMetadata('Project not found or not accessible', { isEmpty: true, description: 'Error' });
    process.exit(0);
  }

  const lines: string[] = [];
  lines.push(...formatProjectDetails(data));

  const state = data.state ?? CONSTANTS.UNKNOWN_STATE;
  const progress = data.progress !== undefined ? Math.round(data.progress * 100) : 0;
  const description = `${state} · ${progress}%`;
  const metadata: Metadata = {
    kind: 'project',
    state,
    isEmpty: false,
    description,
  };

  const content = lines.length > 0 ? lines.join('\n') : 'No project details available';
  outputWithMetadata(content, metadata);
}

function main() {
  const context = getPluginContext();
  const linearLink = context.branchContext.linearLink;

  if (!isValidLink(linearLink)) {
    outputWithMetadata('No Linear link set', { isEmpty: true, description: 'No link' });
    process.exit(0);
  }

  const parsed = parseLinearLink(linearLink);
  if (!parsed) {
    outputWithMetadata('Invalid Linear URL format', { isEmpty: true, description: 'Invalid URL' });
    process.exit(0);
  }

  if (parsed.kind === 'issue') {
    handleIssue(parsed.id);
  } else {
    handleProject(parsed.id);
  }
}

main();
