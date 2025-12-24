import * as fs from 'node:fs';
import {
  BRANCH_CONTEXT_DEFAULT_TODOS,
  BRANCH_CONTEXT_FIELD_BRANCH,
  BRANCH_CONTEXT_FIELD_LINEAR_LINK,
  BRANCH_CONTEXT_FIELD_PR_LINK,
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_NO_CHANGES,
  BRANCH_CONTEXT_SECTION_BRANCH_INFO,
  BRANCH_CONTEXT_SECTION_CHANGED_FILES,
  BRANCH_CONTEXT_SECTION_NOTES,
  BRANCH_CONTEXT_SECTION_OBJECTIVE,
  BRANCH_CONTEXT_SECTION_REQUIREMENTS,
  BRANCH_CONTEXT_SECTION_TODO,
  BUILTIN_SECTION_NAMES,
  METADATA_PP_PREFIX,
  METADATA_SECTION_PREFIX,
  METADATA_SUFFIX,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_TASKS,
} from '../../common/constants';
import { getBranchContextFilePath, getBranchDirectory } from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { BranchContext, BranchContextMetadata, SectionMetadata } from '../../common/schemas/types';

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
    BRANCH_CONTEXT_SECTION_BRANCH_INFO,
    '',
    `${BRANCH_CONTEXT_FIELD_BRANCH} ${branchName}`,
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
  if (codeContent === '' || codeContent === BRANCH_CONTEXT_NO_CHANGES) return undefined;
  return codeContent;
}

type CodeBlockSection = {
  content: string;
  metadata?: SectionMetadata;
};

function extractSectionMetadata(content: string): { cleanContent: string; metadata?: SectionMetadata } {
  const prefix = METADATA_SECTION_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffix = METADATA_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const metadataRegex = new RegExp(`${prefix}(.+?)${suffix}`);
  const match = content.match(metadataRegex);
  if (!match) return { cleanContent: content };

  try {
    const metadata = JSON.parse(match[1]) as SectionMetadata;
    const cleanContent = content.replace(metadataRegex, '').trim();
    return { cleanContent, metadata };
  } catch {
    return { cleanContent: content };
  }
}

function extractAllCodeBlockSections(content: string): Record<string, CodeBlockSection> {
  const sections: Record<string, CodeBlockSection> = {};
  const sectionRegex = /^#\s+([A-Z][A-Z\s]+)\s*\n+```\s*\n([\s\S]*?)\n```(\s*\n+<!-- SECTION_METADATA: (.+?) -->)?/gm;

  const matches = content.matchAll(sectionRegex);
  for (const match of matches) {
    const sectionName = match[1].trim();
    const rawContent = match[2].trim();
    const externalMetadataJson = match[4];

    if (rawContent && rawContent !== BRANCH_CONTEXT_NO_CHANGES) {
      const { cleanContent, metadata: internalMetadata } = extractSectionMetadata(rawContent);

      let metadata: SectionMetadata | undefined = internalMetadata;
      if (externalMetadataJson) {
        try {
          metadata = JSON.parse(externalMetadataJson) as SectionMetadata;
        } catch {
          // ignore parse errors
        }
      }

      sections[sectionName] = { content: cleanContent, metadata };
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
    const sectionContent = content.slice(startIndex, endIndex).trim();

    if (sectionContent.startsWith('```')) continue;

    if (sectionContent && sectionContent !== BRANCH_CONTEXT_NA) {
      const { cleanContent, metadata } = extractSectionMetadata(sectionContent);
      sections[sectionName] = { content: cleanContent, metadata };
    }
  }

  return sections;
}

function extractMetadata(content: string): BranchContextMetadata | undefined {
  const prefix = METADATA_PP_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffix = METADATA_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const metadataRegex = new RegExp(`${prefix}(.+?)${suffix}`);
  const match = content.match(metadataRegex);
  if (!match) return undefined;

  try {
    return JSON.parse(match[1]) as BranchContextMetadata;
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

  const sectionsMetadata: Record<string, SectionMetadata> = {};
  for (const [name, section] of Object.entries(allCustomSections)) {
    if (section.metadata) {
      sectionsMetadata[name] = section.metadata;
    }
  }

  const context: BranchContext = {
    branchName: extractField(content, BRANCH_CONTEXT_FIELD_BRANCH.replace(':', '')),
    prLink: extractField(content, BRANCH_CONTEXT_FIELD_PR_LINK.replace(':', '')),
    linearLink: extractField(content, BRANCH_CONTEXT_FIELD_LINEAR_LINK.replace(':', '')),
    objective: extractSection(content, SECTION_NAME_OBJECTIVE),
    requirements: extractSection(content, SECTION_NAME_REQUIREMENTS),
    notes: extractSection(content, SECTION_NAME_NOTES),
    todos: extractSection(content, SECTION_NAME_TASKS),
    changedFiles: extractCodeBlockSection(content, SECTION_NAME_CHANGED_FILES),
    metadata: {
      ...baseMetadata,
      sections: Object.keys(sectionsMetadata).length > 0 ? sectionsMetadata : undefined,
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

export function branchContextFileExists(workspace: string, branchName: string): boolean {
  return fs.existsSync(getBranchContextFilePath(workspace, branchName));
}
