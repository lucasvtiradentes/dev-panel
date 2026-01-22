import {
  BRANCH_CONTEXT_NO_CHANGES,
  ChangedFilesStyle,
  METADATA_SECTION,
  SECTION_NAME_CHANGED_FILES,
  UNCATEGORIZED_TOPIC,
  createChangedFilesSectionRegex,
} from '../../../../common/constants';
import {
  type ChangedFile,
  ChangedFilesFormatter,
  ChangedFilesParser,
  type ChangedFilesTopic,
  EMPTY_METADATA,
} from '../../../../common/core';
import { Git } from '../../../../common/lib/git';
import { FileIOHelper } from '../../../../common/utils/helpers/node-helper';
import type { AutoSectionProvider, SyncContext } from '../interfaces';

const EMPTY_PROVIDER_METADATA = {
  ...EMPTY_METADATA,
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
      return ChangedFilesFormatter.formatToMarkdownWithMetadata(
        { topics: [], metadata: EMPTY_METADATA },
        EMPTY_PROVIDER_METADATA,
      );
    }

    const metadata = { ...result.sectionMetadata, isEmpty: false, description: result.summary };

    const existingMarkdown = FileIOHelper.readFileIfExists(context.markdownPath);
    if (!existingMarkdown) {
      return ChangedFilesFormatter.formatToMarkdownWithMetadata(
        ChangedFilesParser.parseMarkdown(result.content),
        metadata,
      );
    }

    const existingTopics = ChangedFilesTopicsMerger.parseExistingTopics(existingMarkdown);
    if (!ChangedFilesParser.hasUserDefinedTopics(existingTopics)) {
      return ChangedFilesFormatter.formatToMarkdownWithMetadata(
        ChangedFilesParser.parseMarkdown(result.content),
        metadata,
      );
    }

    const gitFiles = ChangedFilesParser.parseFileLines(result.content);
    const mergedTopics = ChangedFilesTopicsMerger.mergeChangesWithTopics(gitFiles, existingTopics);
    const model = ChangedFilesParser.topicsMapToModel(mergedTopics);

    return ChangedFilesFormatter.formatToMarkdownWithMetadata(model, metadata);
  }
}

class ChangedFilesTopicsMerger {
  private static readonly CHANGED_FILES_SECTION_REGEX = createChangedFilesSectionRegex(
    SECTION_NAME_CHANGED_FILES,
    METADATA_SECTION,
  );

  static parseExistingTopics(markdownContent: string): Map<string, ChangedFilesTopic> {
    const changedFilesMatch = markdownContent.match(ChangedFilesTopicsMerger.CHANGED_FILES_SECTION_REGEX);
    if (!changedFilesMatch) {
      return new Map();
    }
    return ChangedFilesParser.parseMarkdownToMap(changedFilesMatch[1]);
  }

  static mergeChangesWithTopics(
    gitFiles: ChangedFile[],
    existingTopics: Map<string, ChangedFilesTopic>,
  ): Map<string, ChangedFilesTopic> {
    const result = new Map<string, ChangedFilesTopic>();
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
}
