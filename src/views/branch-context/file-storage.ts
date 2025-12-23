import * as fs from 'node:fs';
import {
  BRANCH_CONTEXT_DEFAULT_TODOS,
  BRANCH_CONTEXT_FIELD_LINEAR_LINK,
  BRANCH_CONTEXT_FIELD_PR_LINK,
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_SECTION_CHANGED_FILES,
  BRANCH_CONTEXT_SECTION_NOTES,
  BRANCH_CONTEXT_SECTION_OBJECTIVE,
  BRANCH_CONTEXT_SECTION_REQUIREMENTS,
  BRANCH_CONTEXT_SECTION_TODO,
} from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { BranchContext } from '../../common/schemas/types';

const logger = createLogger('BranchContext');

export function ensureBranchDirectory(workspace: string, branchName: string): void {
  const dirPath = getBranchDirectory(workspace, branchName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function loadBranchContextFromFile(workspace: string, branchName: string): BranchContext {
  const filePath = getBranchContextFilePath(workspace, branchName);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseBranchContext(content);
  } catch (error) {
    logger.error(`Failed to load branch context for ${branchName}: ${error}`);
    return {};
  }
}

export function saveBranchContextToFile(workspace: string, branchName: string, context: BranchContext): void {
  ensureBranchDirectory(workspace, branchName);
  const filePath = getBranchContextFilePath(workspace, branchName);
  const markdown = generateMarkdown(branchName, context);
  fs.writeFileSync(filePath, markdown, 'utf-8');
}

function generateMarkdown(branchName: string, context: BranchContext): string {
  const lines = [
    `# ${branchName}`,
    '',
    `${BRANCH_CONTEXT_FIELD_PR_LINK} ${context.prLink || BRANCH_CONTEXT_NA}`,
    `${BRANCH_CONTEXT_FIELD_LINEAR_LINK} ${context.linearLink || BRANCH_CONTEXT_NA}`,
    '',
    BRANCH_CONTEXT_SECTION_OBJECTIVE,
    '',
    context.objective || BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_REQUIREMENTS,
    '',
    context.requirements || BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_NOTES,
    '',
    context.notes || BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_TODO,
    '',
    context.todos || BRANCH_CONTEXT_DEFAULT_TODOS,
    '',
    BRANCH_CONTEXT_SECTION_CHANGED_FILES,
    '',
    '```',
    context.changedFiles || 'No changes',
    '```',
    '',
  ];
  return lines.join('\n');
}

function extractField(content: string, fieldName: string): string | undefined {
  const regex = new RegExp(`^${fieldName}:\\s*(.*)$`, 'im');
  const match = content.match(regex);
  if (!match) return undefined;

  const value = match[1].trim();
  if (value === BRANCH_CONTEXT_NA || value === '') return undefined;
  return value;
}

function extractSection(content: string, sectionName: string): string | undefined {
  const headerRegex = new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');
  const headerMatch = content.match(headerRegex);
  if (!headerMatch || headerMatch.index === undefined) return undefined;

  const startIndex = headerMatch.index + headerMatch[0].length;
  const afterHeader = content.slice(startIndex);
  const nextHeaderRegex = /^#\s+/m;
  const nextHeaderMatch = afterHeader.match(nextHeaderRegex);
  const endIndex = nextHeaderMatch && nextHeaderMatch.index !== undefined ? nextHeaderMatch.index : afterHeader.length;
  const sectionContent = afterHeader.slice(0, endIndex).trim();

  if (sectionContent === BRANCH_CONTEXT_NA || sectionContent === '') return undefined;
  return sectionContent;
}

function extractCodeBlockSection(content: string, sectionName: string): string | undefined {
  const headerRegex = new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');
  const headerMatch = content.match(headerRegex);
  if (!headerMatch || headerMatch.index === undefined) return undefined;

  const startIndex = headerMatch.index + headerMatch[0].length;
  const afterHeader = content.slice(startIndex);

  const codeBlockMatch = afterHeader.match(/^```\s*\n([\s\S]*?)\n```/m);
  if (!codeBlockMatch) return undefined;

  const codeContent = codeBlockMatch[1].trim();
  if (codeContent === '' || codeContent === 'No changes') return undefined;
  return codeContent;
}

function parseBranchContext(content: string): BranchContext {
  const context: BranchContext = {
    prLink: extractField(content, BRANCH_CONTEXT_FIELD_PR_LINK.replace(':', '')),
    linearLink: extractField(content, BRANCH_CONTEXT_FIELD_LINEAR_LINK.replace(':', '')),
    objective: extractSection(content, 'OBJECTIVE'),
    requirements: extractSection(content, 'REQUIREMENTS'),
    notes: extractSection(content, 'NOTES'),
    todos: extractSection(content, 'TASKS'),
    changedFiles: extractCodeBlockSection(content, 'CHANGED FILES'),
  };

  return context;
}

export function branchContextFileExists(workspace: string, branchName: string): boolean {
  return fs.existsSync(getBranchContextFilePath(workspace, branchName));
}
