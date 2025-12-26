import { execSync } from 'node:child_process';

const CONSTANTS = {
  EXEC_TIMEOUT: 30000,
  ENCODING: 'utf-8' as const,
  UNKNOWN_AUTHOR: 'unknown',
};

type PluginContext = {
  branchContext: {
    prLink: string;
  };
  sectionOptions?: {
    includeRegularComments?: boolean;
    includeReviewComments?: boolean;
  };
};

type PrComment = {
  createdAt: string;
  author?: { login?: string };
  body?: string;
};

type ReviewComment = {
  created_at: string;
  user?: { login?: string };
  body?: string;
  path?: string;
  line?: number;
  original_line?: number;
};

type Metadata = {
  prCommentsCount?: number;
  reviewCommentsCount?: number;
  totalComments?: number;
  isEmpty: boolean;
  description: string;
};

function getPluginContext(): PluginContext {
  return JSON.parse(process.env.PLUGIN_CONTEXT ?? '{}');
}

function isValidLink(link: string): boolean {
  return !!(link && link !== 'N/A' && link.trim() !== '');
}

function parsePrLink(prLink: string): { owner: string; repo: string; prNumber: string } | null {
  const prMatch = prLink.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!prMatch) return null;
  const [, owner, repo, prNumber] = prMatch;
  return { owner, repo, prNumber };
}

function outputWithMetadata(content: string, metadata: Metadata) {
  console.log(`${content}\n`);
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
}

function fetchPrComments(owner: string, repo: string, prNumber: string): PrComment[] {
  try {
    const result = execSync(`gh pr view ${prNumber} --repo ${owner}/${repo} --json comments`, {
      encoding: CONSTANTS.ENCODING,
      timeout: CONSTANTS.EXEC_TIMEOUT,
    });
    const data = JSON.parse(result);
    return data.comments ?? [];
  } catch {
    return [];
  }
}

function fetchReviewComments(owner: string, repo: string, prNumber: string): ReviewComment[] {
  try {
    const result = execSync(`gh api repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
      encoding: CONSTANTS.ENCODING,
      timeout: CONSTANTS.EXEC_TIMEOUT,
    });
    return JSON.parse(result);
  } catch {
    return [];
  }
}

function formatPrComments(comments: PrComment[]): string[] {
  if (comments.length === 0) return [];

  const lines: string[] = [`PR Comments (${comments.length}):\n`];
  for (const comment of comments) {
    const date = new Date(comment.createdAt).toLocaleDateString();
    const author = comment.author?.login ?? CONSTANTS.UNKNOWN_AUTHOR;
    const body = comment.body ?? '';
    lines.push(`@${author} (${date}):\n${body}\n`);
  }
  return lines;
}

function formatReviewComments(comments: ReviewComment[]): string[] {
  if (comments.length === 0) return [];

  const lines: string[] = [`\nCode Review Comments (${comments.length}):\n`];
  for (const comment of comments) {
    const date = new Date(comment.created_at).toLocaleDateString();
    const author = comment.user?.login ?? CONSTANTS.UNKNOWN_AUTHOR;
    const body = comment.body ?? '';
    const file = comment.path ?? '';
    const line = comment.line ?? comment.original_line ?? '';
    lines.push(`@${author} (${date}) [${file}:${line}]:\n${body}\n`);
  }
  return lines;
}

function main() {
  const context = getPluginContext();
  const prLink = context.branchContext.prLink;
  const options = context.sectionOptions ?? {};
  const includeRegularComments = options.includeRegularComments !== false;
  const includeReviewComments = options.includeReviewComments !== false;

  if (!isValidLink(prLink)) {
    outputWithMetadata('No PR link set', { isEmpty: true, description: 'No link' });
    process.exit(0);
  }

  const parsed = parsePrLink(prLink);
  if (!parsed) {
    outputWithMetadata('Invalid PR URL format', { isEmpty: true, description: 'Invalid URL' });
    process.exit(0);
  }

  const { owner, repo, prNumber } = parsed;
  const output: string[] = [];
  let prCommentsCount = 0;
  let reviewCommentsCount = 0;

  if (includeRegularComments) {
    const comments = fetchPrComments(owner, repo, prNumber);
    prCommentsCount = comments.length;
    output.push(...formatPrComments(comments));
  }

  if (includeReviewComments) {
    const comments = fetchReviewComments(owner, repo, prNumber);
    reviewCommentsCount = comments.length;
    output.push(...formatReviewComments(comments));
  }

  const totalComments = prCommentsCount + reviewCommentsCount;
  const isEmpty = totalComments === 0;
  const description = `${prCommentsCount} PR / ${reviewCommentsCount} Review`;
  const metadata: Metadata = { prCommentsCount, reviewCommentsCount, totalComments, isEmpty, description };

  const content = output.length === 0 ? 'No comments yet' : output.join('\n');
  outputWithMetadata(content, metadata);
}

main();
