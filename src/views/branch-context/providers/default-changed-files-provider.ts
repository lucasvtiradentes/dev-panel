import { ChangedFilesStyle } from '../../../common/constants';
import { getChangedFilesWithSummary } from '../git-changed-files';
import type { AutoSectionProvider, SyncContext } from './interfaces';

export class DefaultChangedFilesProvider implements AutoSectionProvider {
  async fetch(context: SyncContext): Promise<string> {
    const result = await getChangedFilesWithSummary(context.workspacePath, ChangedFilesStyle.List);
    return result.content;
  }
}
