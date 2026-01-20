import {
  BRANCH_CONTEXT_NO_CHANGES,
  ChangedFilesStyle,
  METADATA_SECTION,
  METADATA_SECTION_PREFIX,
  METADATA_SUFFIX,
  SECTION_NAME_CHANGED_FILES,
  UNCATEGORIZED_TOPIC,
  createChangedFilesSectionRegex,
} from '../../../../common/constants';
import { Git } from '../../../../common/lib/git';
import {
  type BaseChangedFile,
  ChangedFilesUtils,
  type ParsedTopic,
} from '../../../../common/utils/changed-files-utils';
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
  renamed: 0,
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

type TopicFiles = ParsedTopic<BaseChangedFile>;

class ChangedFilesTopicsHelper {
  private static readonly CHANGED_FILES_SECTION_REGEX = createChangedFilesSectionRegex(
    SECTION_NAME_CHANGED_FILES,
    METADATA_SECTION,
  );

  static parseExistingTopics(markdownContent: string): Map<string, TopicFiles> {
    const changedFilesMatch = markdownContent.match(ChangedFilesTopicsHelper.CHANGED_FILES_SECTION_REGEX);
    if (!changedFilesMatch) {
      return new Map();
    }

    const { topics } = ChangedFilesUtils.parseFileLines<BaseChangedFile>(
      changedFilesMatch[1],
      (status, path, added, deleted) => ({ status, path, added, deleted }),
    );

    return topics;
  }

  static parseGitChanges(gitContent: string): BaseChangedFile[] {
    const { files } = ChangedFilesUtils.parseFileLines<BaseChangedFile>(gitContent, (status, path, added, deleted) => ({
      status,
      path,
      added,
      deleted,
    }));
    return files;
  }

  static mergeChangesWithTopics(
    gitFiles: BaseChangedFile[],
    existingTopics: Map<string, TopicFiles>,
  ): Map<string, TopicFiles> {
    const result = new Map<string, TopicFiles>();
    const gitFileMap = new Map(gitFiles.map((f) => [f.path, f]));
    const assignedFiles = new Set<string>();

    for (const [topicName, topic] of existingTopics) {
      const updatedFiles: BaseChangedFile[] = [];

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

    const uncategorizedFiles: BaseChangedFile[] = [];
    for (const gitFile of gitFiles) {
      if (!assignedFiles.has(gitFile.path)) {
        uncategorizedFiles.push(gitFile);
      }
    }

    if (uncategorizedFiles.length > 0) {
      const existing = result.get(UNCATEGORIZED_TOPIC);
      if (existing) {
        existing.files.push(...uncategorizedFiles);
      } else {
        result.set(UNCATEGORIZED_TOPIC, {
          name: UNCATEGORIZED_TOPIC,
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

    const allFiles: BaseChangedFile[] = [];
    for (const topic of topics.values()) {
      allFiles.push(...topic.files);
    }

    if (allFiles.length === 0) {
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const maxFileLength = Math.max(...allFiles.map((f) => f.path.length));
    const lines: string[] = [];

    const sortedTopics = ChangedFilesUtils.sortTopicEntries(Array.from(topics.entries()));

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
      if (name !== UNCATEGORIZED_TOPIC && topic.isUserCreated) {
        return true;
      }
    }
    return false;
  }
}
