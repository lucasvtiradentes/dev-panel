import {
  BRANCH_CONTEXT_NO_CHANGES,
  ChangedFilesStyle,
  METADATA_SECTION_PREFIX,
  METADATA_SUFFIX,
} from '../../../../common/constants';
import { Git } from '../../../../common/lib/git';
import { FileIOHelper } from '../../../../common/utils/helpers/node-helper';
import type { AutoSectionProvider, SyncContext } from '../interfaces';
import {
  formatTopicsToMarkdown,
  hasUserDefinedTopics,
  mergeChangesWithTopics,
  parseExistingTopics,
  parseGitChanges,
} from './changed-files-topics';

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
    const result = await Git.getChangedFilesWithSummary(context.workspacePath, ChangedFilesStyle.List);

    if (result.content === BRANCH_CONTEXT_NO_CHANGES || !result.sectionMetadata) {
      return formatWithMetadata(BRANCH_CONTEXT_NO_CHANGES, EMPTY_METADATA);
    }

    const metadata = { ...result.sectionMetadata, isEmpty: false, description: result.summary };

    const existingMarkdown = FileIOHelper.readFileIfExists(context.markdownPath);
    if (!existingMarkdown) {
      return formatWithMetadata(result.content, metadata);
    }

    const existingTopics = parseExistingTopics(existingMarkdown);
    if (!hasUserDefinedTopics(existingTopics)) {
      return formatWithMetadata(result.content, metadata);
    }

    const gitFiles = parseGitChanges(result.content);
    const mergedTopics = mergeChangesWithTopics(gitFiles, existingTopics);
    const formattedContent = formatTopicsToMarkdown(mergedTopics);

    return formatWithMetadata(formattedContent, metadata);
  }
}
