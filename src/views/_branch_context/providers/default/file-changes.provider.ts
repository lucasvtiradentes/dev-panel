import { ChangedFilesStyle } from '../../../../common/constants';
import type { AutoSectionProvider, SyncContext } from '../interfaces';
import { getChangedFilesWithSummary } from './file-changes-utils';

export class DefaultFileChangesProvider implements AutoSectionProvider {
  async fetch(context: SyncContext): Promise<string> {
    const result = await getChangedFilesWithSummary(context.workspacePath, ChangedFilesStyle.List);

    if (result.sectionMetadata) {
      const metadataJson = JSON.stringify(result.sectionMetadata);
      return `${result.content}\n\n<!-- SECTION_METADATA: ${metadataJson} -->`;
    }

    return result.content;
  }
}
