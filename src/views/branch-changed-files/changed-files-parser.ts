import { BRANCH_CONTEXT_NO_CHANGES, GitFileStatus } from '../../common/constants';
import { type ChangedFilesSummary, Git } from '../../common/lib/git';
import { ChangedFilesUtils } from '../../common/utils/changed-files-utils';
import { NodePathHelper } from '../../common/utils/helpers/node-helper';
import type { ChangedFileNode, FileStatus, TopicNode } from './tree-items';

type ChangedFilesMetadata = ChangedFilesSummary & {
  filesCount: number;
  summary: string;
  isEmpty: boolean;
};

export type ParseResult = {
  topics: TopicNode[];
  metadata: ChangedFilesMetadata;
};

export class ChangedFilesParser {
  static parseFromMarkdown(changedFilesContent: string | undefined): ParseResult {
    if (!changedFilesContent || changedFilesContent === BRANCH_CONTEXT_NO_CHANGES) {
      return {
        topics: [],
        metadata: {
          filesCount: 0,
          added: 0,
          modified: 0,
          deleted: 0,
          renamed: 0,
          summary: '',
          isEmpty: true,
        },
      };
    }

    const { topics, files } = ChangedFilesUtils.parseFileLines<ChangedFileNode>(
      changedFilesContent,
      (status, path, added, deleted) => ({
        status: status as FileStatus,
        path,
        filename: NodePathHelper.basename(path),
        added,
        deleted,
      }),
    );

    let added = 0;
    let modified = 0;
    let deleted = 0;
    let renamed = 0;

    for (const file of files) {
      if (file.status === GitFileStatus.Added || file.status === '?') added++;
      else if (file.status === GitFileStatus.Modified) modified++;
      else if (file.status === GitFileStatus.Deleted) deleted++;
      else if (file.status === GitFileStatus.Renamed) renamed++;
    }

    const sortedTopics = ChangedFilesUtils.sortTopics(Array.from(topics.values()));
    const filesCount = added + modified + deleted + renamed;
    const summary: ChangedFilesSummary = { added, modified, deleted, renamed };

    return {
      topics: sortedTopics,
      metadata: {
        ...summary,
        filesCount,
        summary: Git.formatChangedFilesSummary(summary),
        isEmpty: filesCount === 0,
      },
    };
  }
}
