import * as fs from 'node:fs';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/constants/scripts-constants';
import type { BranchContext } from '../../common/schemas/types';

const NA = 'N/A';
const DEFAULT_TODOS = '- [ ] task1\n- [ ] task2';

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
    console.error(`Failed to load branch context for ${branchName}:`, error);
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
    `PR LINK: ${context.prLink || NA}`,
    `LINEAR LINK: ${context.linearLink || NA}`,
    '',
    '# OBJECTIVE',
    '',
    context.objective || NA,
    '',
    '# NOTES',
    '',
    context.notes || NA,
    '',
    '# TODO',
    '',
    context.todos || DEFAULT_TODOS,
    '',
  ];
  return lines.join('\n');
}

function extractField(content: string, fieldName: string): string | undefined {
  const regex = new RegExp(`^${fieldName}:\\s*(.*)$`, 'im');
  const match = content.match(regex);
  if (!match) return undefined;

  const value = match[1].trim();
  if (value === NA || value === '') return undefined;
  return value;
}

function extractSection(content: string, sectionName: string): string | undefined {
  const headerRegex = new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');
  const headerMatch = content.match(headerRegex);
  if (!headerMatch) return undefined;

  const startIndex = headerMatch.index! + headerMatch[0].length;
  const afterHeader = content.slice(startIndex);
  const nextHeaderRegex = /^#\s+/m;
  const nextHeaderMatch = afterHeader.match(nextHeaderRegex);
  const endIndex = nextHeaderMatch ? nextHeaderMatch.index! : afterHeader.length;
  const sectionContent = afterHeader.slice(0, endIndex).trim();

  if (sectionContent === NA || sectionContent === '') return undefined;
  return sectionContent;
}

function parseBranchContext(content: string): BranchContext {
  const context: BranchContext = {
    prLink: extractField(content, 'PR LINK'),
    linearLink: extractField(content, 'LINEAR LINK'),
    objective: extractSection(content, 'OBJECTIVE'),
    notes: extractSection(content, 'NOTES'),
    todos: extractSection(content, 'TODO'),
  };

  return context;
}

export function branchContextFileExists(workspace: string, branchName: string): boolean {
  return fs.existsSync(getBranchContextFilePath(workspace, branchName));
}
