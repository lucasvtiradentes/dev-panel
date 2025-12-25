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
  assignee?: string;
  labels?: LinearLabel[];
  description?: string;
  comments?: LinearComment[];
};

type Metadata = {
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

function parseLinearLink(linearLink: string): string | null {
  const issueMatch = linearLink.match(/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/);
  return issueMatch ? issueMatch[1] : null;
}

function outputWithMetadata(content: string, metadata: Metadata): void {
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

function formatIssueDetails(data: LinearIssue): string[] {
  const lines: string[] = [];

  if (data.title) lines.push(`Title: ${data.title}`);
  if (data.state?.name) lines.push(`State: ${data.state.name}`);
  if (data.priority) lines.push(`Priority: ${data.priority}`);
  if (data.assignee) lines.push(`Assignee: ${data.assignee}`);

  if (data.labels?.length) {
    const labelNames = data.labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean);
    if (labelNames.length) lines.push(`Labels: ${labelNames.join(', ')}`);
  }

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

function main(): void {
  const context = getPluginContext();
  const linearLink = context.branchContext.linearLink;

  if (!isValidLink(linearLink)) {
    outputWithMetadata('No Linear link set', { isEmpty: true, description: 'No link' });
    process.exit(0);
  }

  const issueId = parseLinearLink(linearLink);
  if (!issueId) {
    outputWithMetadata('Invalid Linear URL format', { isEmpty: true, description: 'Invalid URL' });
    process.exit(0);
  }

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
    state,
    priority: data.priority ?? CONSTANTS.PRIORITY_NONE,
    commentsCount,
    isEmpty: false,
    description,
  };

  const content = lines.length > 0 ? lines.join('\n') : 'No issue details available';
  outputWithMetadata(content, metadata);
}

main();
