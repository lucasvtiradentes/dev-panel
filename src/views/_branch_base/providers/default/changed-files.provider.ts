import {
  BRANCH_CONTEXT_NO_CHANGES,
  ChangedFilesStyle,
  METADATA_SECTION_PREFIX,
  METADATA_SUFFIX,
} from '../../../../common/constants';
import { Git } from '../../../../common/lib/git';
import type { AutoSectionProvider, SyncContext } from '../interfaces';

export class DefaultChangedFilesProvider implements AutoSectionProvider {
  async fetch(context: SyncContext): Promise<string> {
    const result = await Git.getChangedFilesWithSummary(context.workspacePath, ChangedFilesStyle.List);

    if (result.content === BRANCH_CONTEXT_NO_CHANGES || !result.sectionMetadata) {
      const emptyMetadata = {
        filesCount: 0,
        added: 0,
        modified: 0,
        deleted: 0,
        isEmpty: true,
        description: 'No changes',
      };
      return `${result.content}\n\n${METADATA_SECTION_PREFIX}${JSON.stringify(emptyMetadata)}${METADATA_SUFFIX}`;
    }

    const metadata = { ...result.sectionMetadata, isEmpty: false, description: result.summary };
    return `${result.content}\n\n${METADATA_SECTION_PREFIX}${JSON.stringify(metadata)}${METADATA_SUFFIX}`;
  }
}
