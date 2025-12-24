import { ChangedFilesStyle } from '../../common/constants';
import { BRANCH_CONTEXT_NO_CHANGES } from '../../common/constants/scripts-constants';
import { getChangedFilesWithSummary } from './git-changed-files';

export async function getDefaultChangedFiles(workspacePath: string): Promise<{
  content: string;
  metadata: Record<string, unknown>;
}> {
  const result = await getChangedFilesWithSummary(workspacePath, ChangedFilesStyle.List);

  const isEmpty = result.content === BRANCH_CONTEXT_NO_CHANGES;
  const summary = result.summary || BRANCH_CONTEXT_NO_CHANGES;

  return {
    content: result.content,
    metadata: {
      ...result.sectionMetadata,
      isEmpty,
      description: summary,
    },
  };
}
