import {
  BRANCH_CONTEXT_NO_CHANGES,
  ChangedFilesStyle,
  METADATA_SECTION,
  METADATA_SECTION_PREFIX,
  METADATA_SUFFIX,
  MILESTONE_HEADER_PATTERN,
  SECTION_NAME_CHANGED_FILES,
} from '../../../../common/constants';
import { Git } from '../../../../common/lib/git';
import { FileIOHelper } from '../../../../common/utils/helpers/node-helper';
import type { AutoSectionProvider, SyncContext } from '../interfaces';

function formatWithMetadata(content: string, metadata: Record<string, unknown>): string {
  return `${content}\n\n${METADATA_SECTION_PREFIX}${JSON.stringify(metadata)}${METADATA_SUFFIX}`;
}

const EMPTY_METADATA = {
  filesCount: 0,
  added: 0,
  modified: 0,
  deleted: 0,
  isEmpty: true,
  description: 'No changes',
};

export class DefaultChangedFilesProvider implements AutoSectionProvider {
  async fetch(context: SyncContext): Promise<string> {
    const result = await Git.getChangedFilesWithSummary(
      context.workspacePath,
      ChangedFilesStyle.List,
      context.comparisonBranch,
    );

    if (result.content === BRANCH_CONTEXT_NO_CHANGES || !result.sectionMetadata) {
      return formatWithMetadata(BRANCH_CONTEXT_NO_CHANGES, EMPTY_METADATA);
    }

    const metadata = { ...result.sectionMetadata, isEmpty: false, description: result.summary };

    const existingMarkdown = FileIOHelper.readFileIfExists(context.markdownPath);
    if (!existingMarkdown) {
      return formatWithMetadata(result.content, metadata);
    }

    const existingTopics = ChangedFilesTopicsHelper.parseExistingTopics(existingMarkdown);
    if (!ChangedFilesTopicsHelper.hasUserDefinedTopics(existingTopics)) {
      return formatWithMetadata(result.content, metadata);
    }

    const gitFiles = ChangedFilesTopicsHelper.parseGitChanges(result.content);
    const mergedTopics = ChangedFilesTopicsHelper.mergeChangesWithTopics(gitFiles, existingTopics);
    const formattedContent = ChangedFilesTopicsHelper.formatTopicsToMarkdown(mergedTopics);

    return formatWithMetadata(formattedContent, metadata);
  }
}

type ChangedFile = {
  status: string;
  path: string;
  added: string;
  deleted: string;
};

type TopicFiles = {
  name: string;
  files: ChangedFile[];
  isUserCreated: boolean;
};

class ChangedFilesTopicsHelper {
  private static readonly UNCATEGORIZED_TOPIC = 'Uncategorized';
  private static readonly FILE_LINE_REGEX = /^([AMD])\s{2}(.+?)\s+\(([+-]\d+)\s([+-]\d+)\)$/;
  private static readonly CHANGED_FILES_SECTION_REGEX = new RegExp(
    `# ${SECTION_NAME_CHANGED_FILES}\\s*\\n([\\s\\S]*?)(?=\\n#[^#]|\\n<!-- ${METADATA_SECTION}|$)`,
  );

  static parseExistingTopics(markdownContent: string): Map<string, TopicFiles> {
    const topics = new Map<string, TopicFiles>();
    const changedFilesMatch = markdownContent.match(ChangedFilesTopicsHelper.CHANGED_FILES_SECTION_REGEX);

    if (!changedFilesMatch) {
      return topics;
    }

    const sectionContent = changedFilesMatch[1];
    const lines = sectionContent.split('\n');

    let currentTopic: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '```') continue;

      const topicMatch = trimmed.match(MILESTONE_HEADER_PATTERN);
      if (topicMatch) {
        currentTopic = topicMatch[1].trim();
        if (!topics.has(currentTopic)) {
          topics.set(currentTopic, { name: currentTopic, files: [], isUserCreated: true });
        }
        continue;
      }

      const fileMatch = trimmed.match(ChangedFilesTopicsHelper.FILE_LINE_REGEX);
      if (fileMatch && currentTopic) {
        const file: ChangedFile = {
          status: fileMatch[1],
          path: fileMatch[2].trim(),
          added: fileMatch[3],
          deleted: fileMatch[4],
        };
        const topicData = topics.get(currentTopic);
        if (topicData) {
          topicData.files.push(file);
        }
      }
    }

    return topics;
  }

  static parseGitChanges(gitContent: string): ChangedFile[] {
    if (gitContent === BRANCH_CONTEXT_NO_CHANGES) {
      return [];
    }

    const files: ChangedFile[] = [];
    const lines = gitContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(ChangedFilesTopicsHelper.FILE_LINE_REGEX);
      if (match) {
        files.push({
          status: match[1],
          path: match[2].trim(),
          added: match[3],
          deleted: match[4],
        });
      }
    }

    return files;
  }

  static mergeChangesWithTopics(
    gitFiles: ChangedFile[],
    existingTopics: Map<string, TopicFiles>,
  ): Map<string, TopicFiles> {
    const result = new Map<string, TopicFiles>();
    const gitFileMap = new Map(gitFiles.map((f) => [f.path, f]));
    const assignedFiles = new Set<string>();

    for (const [topicName, topic] of existingTopics) {
      const updatedFiles: ChangedFile[] = [];

      for (const existingFile of topic.files) {
        const gitFile = gitFileMap.get(existingFile.path);
        if (gitFile) {
          updatedFiles.push(gitFile);
          assignedFiles.add(existingFile.path);
        }
      }

      if (updatedFiles.length > 0 || topic.isUserCreated) {
        result.set(topicName, {
          name: topicName,
          files: updatedFiles,
          isUserCreated: topic.isUserCreated,
        });
      }
    }

    const uncategorizedFiles: ChangedFile[] = [];
    for (const gitFile of gitFiles) {
      if (!assignedFiles.has(gitFile.path)) {
        uncategorizedFiles.push(gitFile);
      }
    }

    if (uncategorizedFiles.length > 0) {
      const existing = result.get(ChangedFilesTopicsHelper.UNCATEGORIZED_TOPIC);
      if (existing) {
        existing.files.push(...uncategorizedFiles);
      } else {
        result.set(ChangedFilesTopicsHelper.UNCATEGORIZED_TOPIC, {
          name: ChangedFilesTopicsHelper.UNCATEGORIZED_TOPIC,
          files: uncategorizedFiles,
          isUserCreated: false,
        });
      }
    }

    return result;
  }

  static formatTopicsToMarkdown(topics: Map<string, TopicFiles>): string {
    if (topics.size === 0) {
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const allFiles: ChangedFile[] = [];
    for (const topic of topics.values()) {
      allFiles.push(...topic.files);
    }

    if (allFiles.length === 0) {
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const maxFileLength = Math.max(...allFiles.map((f) => f.path.length));
    const lines: string[] = [];

    const sortedTopics = Array.from(topics.entries()).sort((a, b) => {
      if (a[0] === ChangedFilesTopicsHelper.UNCATEGORIZED_TOPIC) return -1;
      if (b[0] === ChangedFilesTopicsHelper.UNCATEGORIZED_TOPIC) return 1;
      return a[0].localeCompare(b[0]);
    });

    for (const [topicName, topic] of sortedTopics) {
      if (topic.files.length === 0 && !topic.isUserCreated) {
        continue;
      }

      lines.push(`## ${topicName}`);

      const sortedFiles = [...topic.files].sort((a, b) => a.path.localeCompare(b.path));
      for (const file of sortedFiles) {
        const padding = ' '.repeat(Math.max(0, maxFileLength - file.path.length + 1));
        lines.push(`${file.status}  ${file.path}${padding}(${file.added} ${file.deleted})`);
      }

      lines.push('');
    }

    return lines.join('\n').trim();
  }

  static hasUserDefinedTopics(existingTopics: Map<string, TopicFiles>): boolean {
    for (const [name, topic] of existingTopics) {
      if (name !== ChangedFilesTopicsHelper.UNCATEGORIZED_TOPIC && topic.isUserCreated) {
        return true;
      }
    }
    return false;
  }
}
