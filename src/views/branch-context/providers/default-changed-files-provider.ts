import { ChangedFilesStyle } from '../../../common/constants';
import { getChangedFilesTree } from '../git-changed-files';
import type { AutoSectionProvider, SyncContext } from './interfaces';

export class DefaultChangedFilesProvider implements AutoSectionProvider {
  async fetch(context: SyncContext): Promise<string> {
    const tree = await getChangedFilesTree(context.workspacePath, ChangedFilesStyle.List);
    return tree;
  }
}
