import * as fs from 'node:fs';
import {
  BRANCH_CONTEXT_DEFAULT_TODOS,
  BRANCH_CONTEXT_FIELD_BRANCH,
  BRANCH_CONTEXT_FIELD_LINEAR_LINK,
  BRANCH_CONTEXT_FIELD_PR_LINK,
  BRANCH_CONTEXT_FIELD_TYPE,
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_NO_CHANGES,
  BRANCH_CONTEXT_SECTION_BRANCH_INFO,
  BRANCH_CONTEXT_SECTION_CHANGED_FILES,
  BRANCH_CONTEXT_SECTION_NOTES,
  BRANCH_CONTEXT_SECTION_OBJECTIVE,
  BRANCH_CONTEXT_SECTION_REQUIREMENTS,
  BRANCH_CONTEXT_SECTION_TODO,
  BUILTIN_SECTION_NAMES,
  METADATA_DEVPANEL_PREFIX,
  METADATA_DEVPANEL_REGEX,
  METADATA_SEPARATOR_REGEX,
  METADATA_SUFFIX,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_TASKS,
} from '../../../common/constants';
import { getBranchContextFilePath } from '../../../common/lib/config-manager';
import { createLogger } from '../../../common/lib/logger';
import type { BranchContext, BranchContextMetadata, SectionMetadata } from '../../../common/schemas/types';
import { extractSectionMetadata } from '../../../common/utils/metadata-extractor';
import { parseBranchTypeCheckboxes } from './branch-type-utils';

const logger = createLogger('BranchContext');

export function loadBranchContextFromFile(workspace: string, branchName: string): BranchContext {
  const filePath = getBranchContextFilePath(workspace, branchName);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseBranchContext(content);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load branch context for ${branchName}: ${message}`);
    return {};
  }
}

function generateMarkdown(branchName: string, context: BranchContext): string {
  const lines = [
    BRANCH_CONTEXT_SECTION_BRANCH_INFO,
    '',
    `${BRANCH_CONTEXT_FIELD_BRANCH} ${branchName}`,
    `${BRANCH_CONTEXT_FIELD_PR_LINK} ${context.prLink ?? BRANCH_CONTEXT_NA}`,
    `${BRANCH_CONTEXT_FIELD_LINEAR_LINK} ${context.linearLink ?? BRANCH_CONTEXT_NA}`,
    '',
    BRANCH_CONTEXT_SECTION_OBJECTIVE,
    '',
    context.objective ?? BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_REQUIREMENTS,
    '',
    context.requirements ?? BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_NOTES,
    '',
    context.notes ?? BRANCH_CONTEXT_NA,
    '',
    BRANCH_CONTEXT_SECTION_TODO,
    '',
    context.todos ?? BRANCH_CONTEXT_DEFAULT_TODOS,
    '',
    BRANCH_CONTEXT_SECTION_CHANGED_FILES,
    '',
    '```',
    context.changedFiles ?? BRANCH_CONTEXT_NO_CHANGES,
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
  if (value === BRANCH_CONTEXT_NA) return undefined;
  return value;
}

function extractBranchType(content: string): string | undefined {
  const fieldValue = extractField(content, BRANCH_CONTEXT_FIELD_TYPE.replace(':', ''));
  if (!fieldValue) return undefined;

  return parseBranchTypeCheckboxes(fieldValue);
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

  if (sectionContent === BRANCH_CONTEXT_NA) return undefined;
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
  if (codeContent === '' || codeContent === BRANCH_CONTEXT_NO_CHANGES) return undefined;
  return codeContent;
}

type CodeBlockSection = {
  content: string;
  metadata?: SectionMetadata;
};

function extractAllCodeBlockSections(content: string): Record<string, CodeBlockSection> {
  const sections: Record<string, CodeBlockSection> = {};
  const sectionRegex = /^#\s+([A-Z][A-Z\s]+)\s*\n+```\s*\n([\s\S]*?)\n```(\s*\n+<!-- SECTION_METADATA: (.+?) -->)?/gm;

  const matches = content.matchAll(sectionRegex);
  for (const match of matches) {
    const sectionName = match[1].trim();
    const rawContent = match[2].trim();
    const externalMetadataJson = match[4];

    let metadata: SectionMetadata | undefined;
    if (externalMetadataJson) {
      try {
        const parsed = JSON.parse(externalMetadataJson);
        if (typeof parsed === 'object' && parsed !== null) {
          metadata = parsed as SectionMetadata;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[extractAllCodeBlockSections] Failed to parse metadata for ${sectionName}: ${message}`);
      }
    }

    const hasValidContent = rawContent && rawContent !== BRANCH_CONTEXT_NO_CHANGES;

    if (hasValidContent || metadata) {
      const { cleanContent, metadata: internalMetadata } = extractSectionMetadata(rawContent);
      const finalMetadata = metadata || internalMetadata;
      const finalContent = hasValidContent ? cleanContent : '';
      sections[sectionName] = { content: finalContent, metadata: finalMetadata };
    }
  }

  return sections;
}

function extractAllTextSections(content: string, excludeNames: string[]): Record<string, CodeBlockSection> {
  const sections: Record<string, CodeBlockSection> = {};
  const sectionRegex = /^#\s+([A-Z][A-Z\s]+)\s*$/gm;

  const matches = [...content.matchAll(sectionRegex)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionName = match[1].trim();

    if (excludeNames.includes(sectionName)) continue;
    if (match.index === undefined) continue;

    const startIndex = match.index + match[0].length;
    const nextMatch = matches[i + 1];
    const endIndex = nextMatch?.index ?? content.length;
    let sectionContent = content.slice(startIndex, endIndex).trim();

    if (sectionContent.startsWith('```')) continue;

    sectionContent = sectionContent.replace(METADATA_DEVPANEL_REGEX, '').replace(METADATA_SEPARATOR_REGEX, '').trim();

    if (sectionContent && sectionContent !== BRANCH_CONTEXT_NA) {
      const { cleanContent, metadata } = extractSectionMetadata(sectionContent);
      sections[sectionName] = { content: cleanContent, metadata };
    }
  }

  return sections;
}

function extractMetadata(content: string): BranchContextMetadata | undefined {
  const prefix = METADATA_DEVPANEL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffix = METADATA_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const metadataRegex = new RegExp(`${prefix}(.+?)${suffix}`);
  const match = content.match(metadataRegex);
  if (!match) return undefined;

  try {
    const parsed = JSON.parse(match[1]);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as BranchContextMetadata;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function parseBranchContext(content: string): BranchContext {
  const baseMetadata = extractMetadata(content) ?? {};

  const codeBlockSections = extractAllCodeBlockSections(content);
  const textSections = extractAllTextSections(content, BUILTIN_SECTION_NAMES);
  const allCustomSections = { ...codeBlockSections, ...textSections };

  logger.info(`[parseBranchContext] Found code block sections: ${Object.keys(codeBlockSections).join(', ')}`);
  logger.info(`[parseBranchContext] Found text sections: ${Object.keys(textSections).join(', ')}`);

  const inlineSectionsMetadata: Record<string, SectionMetadata> = {};
  for (const [name, section] of Object.entries(allCustomSections)) {
    if (section.metadata) {
      inlineSectionsMetadata[name] = section.metadata;
    }
  }

  logger.info(
    `[parseBranchContext] Inline metadata sections: ${Object.keys(inlineSectionsMetadata).join(', ') || 'none'}`,
  );
  logger.info(
    `[parseBranchContext] Footer metadata sections: ${Object.keys(baseMetadata.sections || {}).join(', ') || 'none'}`,
  );

  const mergedSectionsMetadata = {
    ...(baseMetadata.sections || {}),
    ...inlineSectionsMetadata,
  };

  logger.info(
    `[parseBranchContext] Merged metadata sections: ${Object.keys(mergedSectionsMetadata).join(', ') || 'none'}`,
  );

  const context: BranchContext = {
    branchName: extractField(content, BRANCH_CONTEXT_FIELD_BRANCH.replace(':', '')),
    branchType: extractBranchType(content),
    prLink: extractField(content, BRANCH_CONTEXT_FIELD_PR_LINK.replace(':', '')),
    linearLink: extractField(content, BRANCH_CONTEXT_FIELD_LINEAR_LINK.replace(':', '')),
    objective: extractSection(content, SECTION_NAME_OBJECTIVE),
    requirements: extractSection(content, SECTION_NAME_REQUIREMENTS),
    notes: extractSection(content, SECTION_NAME_NOTES),
    todos: extractSection(content, SECTION_NAME_TASKS),
    changedFiles: extractCodeBlockSection(content, SECTION_NAME_CHANGED_FILES),
    metadata: {
      ...baseMetadata,
      sections: Object.keys(mergedSectionsMetadata).length > 0 ? mergedSectionsMetadata : undefined,
    },
  };

  for (const [name, section] of Object.entries(allCustomSections)) {
    if (name !== SECTION_NAME_CHANGED_FILES) {
      logger.info(`[parseBranchContext] Adding custom section: ${name}`);
      (context as Record<string, unknown>)[name] = section.content;
    }
  }

  return context;
}
