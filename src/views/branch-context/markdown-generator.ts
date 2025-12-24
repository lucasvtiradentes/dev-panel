import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  BRANCH_CONTEXT_DEFAULT_TODOS,
  BRANCH_CONTEXT_NA,
  type BranchType,
  ChangedFilesStyle,
  METADATA_PP_PREFIX,
  METADATA_SECTION_PREFIX,
  METADATA_SEPARATOR,
  METADATA_SUFFIX,
} from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { BranchContext } from '../../common/schemas/types';
import { detectBranchType, generateBranchTypeCheckboxes } from './branch-type-utils';
import { getChangedFilesTree } from './git-changed-files';
import { loadTemplate } from './template-parser';

type SectionMetadataMap = Record<string, Record<string, unknown>>;

const logger = createLogger('MarkdownGenerator');

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export async function generateBranchContextMarkdown(
  branchName: string,
  context: BranchContext,
  sectionMetadata?: SectionMetadataMap,
): Promise<void> {
  logger.info(`[generateBranchContextMarkdown] Called for branch: ${branchName}`);

  const workspace = getWorkspacePath();
  if (!workspace) {
    logger.warn('[generateBranchContextMarkdown] No workspace found');
    return;
  }

  logger.info(`[generateBranchContextMarkdown] Workspace: ${workspace}`);

  const dirPath = getBranchDirectory(workspace, branchName);
  if (!fs.existsSync(dirPath)) {
    logger.info(`[generateBranchContextMarkdown] Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const mdPath = getBranchContextFilePath(workspace, branchName);
  logger.info(`[generateBranchContextMarkdown] Markdown path: ${mdPath}`);

  const template = loadTemplate(workspace);

  const useExistingChanges = !!context.changedFiles;
  logger.info(`[generateBranchContextMarkdown] Using existing changed files: ${useExistingChanges}`);

  const changedFilesTree = context.changedFiles || (await getChangedFilesTree(workspace, ChangedFilesStyle.List));
  logger.info(
    `[generateBranchContextMarkdown] Changed files result (first 100 chars): ${changedFilesTree.substring(0, 100)}`,
  );

  const branchType = (context.branchType as BranchType | undefined) ?? detectBranchType(branchName);
  const branchTypeCheckboxes = generateBranchTypeCheckboxes(branchType);

  const replacements: Record<string, string> = {
    BRANCH_NAME: branchName,
    BRANCH_TYPE: branchTypeCheckboxes,
    PR_LINK: context.prLink || BRANCH_CONTEXT_NA,
    LINEAR_LINK: context.linearLink || BRANCH_CONTEXT_NA,
    OBJECTIVE: context.objective || BRANCH_CONTEXT_NA,
    REQUIREMENTS: context.requirements || BRANCH_CONTEXT_NA,
    NOTES: context.notes || BRANCH_CONTEXT_NA,
    TASKS: context.todos || BRANCH_CONTEXT_DEFAULT_TODOS,
    CHANGED_FILES: changedFilesTree,
  };

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' && !(key in replacements)) {
      const placeholderKey = key.toUpperCase().replace(/\s+/g, '_');
      replacements[placeholderKey] = value;
      logger.info(`[generateBranchContextMarkdown] Added custom replacement: ${placeholderKey}`);
    }
  }

  logger.info(`[generateBranchContextMarkdown] All replacements: ${Object.keys(replacements).join(', ')}`);

  let output = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    output = output.replace(regex, value);
  }

  if (sectionMetadata) {
    output = appendSectionMetadata(output, sectionMetadata);
  }

  if (context.metadata) {
    const metadataJson = JSON.stringify(context.metadata);
    output += `\n\n${METADATA_SEPARATOR}\n\n${METADATA_PP_PREFIX}${metadataJson}${METADATA_SUFFIX}`;
  }

  fs.writeFileSync(mdPath, output);
}

function appendSectionMetadata(content: string, sectionMetadata: SectionMetadataMap): string {
  let result = content;

  for (const [sectionName, metadata] of Object.entries(sectionMetadata)) {
    const sectionHeaderRegex = new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');
    const headerMatch = result.match(sectionHeaderRegex);

    if (!headerMatch || headerMatch.index === undefined) {
      logger.warn(`[appendSectionMetadata] Header not found for section: ${sectionName}`);
      continue;
    }

    const afterHeader = result.slice(headerMatch.index + headerMatch[0].length);
    const codeBlockMatch = afterHeader.match(/^(\s*\n```[\s\S]*?```)/m);

    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
      const insertPosition =
        headerMatch.index + headerMatch[0].length + codeBlockMatch.index + codeBlockMatch[0].length;
      const metadataStr = `\n\n${METADATA_SECTION_PREFIX}${JSON.stringify(metadata)}${METADATA_SUFFIX}`;
      result = result.slice(0, insertPosition) + metadataStr + result.slice(insertPosition);
    } else {
      logger.warn(`[appendSectionMetadata] Code block not found for section: ${sectionName}`);
    }
  }

  return result;
}
