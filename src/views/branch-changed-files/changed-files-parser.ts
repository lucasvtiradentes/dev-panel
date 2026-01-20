import {
  BRANCH_CONTEXT_NO_CHANGES,
  CHANGED_FILE_LINE_PATTERN,
  MILESTONE_HEADER_PATTERN,
  UNCATEGORIZED_TOPIC,
} from '../../common/constants';
import { NodePathHelper } from '../../common/utils/helpers/node-helper';
import type { ChangedFileNode, FileStatus, TopicNode } from './tree-items';

type ChangedFilesMetadata = {
  filesCount: number;
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
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

    const topics = new Map<string, TopicNode>();
    const lines = changedFilesContent.split('\n');
    let currentTopic: string | null = null;

    let added = 0;
    let modified = 0;
    let deleted = 0;
    let renamed = 0;

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

      const fileMatch = trimmed.match(CHANGED_FILE_LINE_PATTERN);
      if (fileMatch) {
        const status = fileMatch[1] as FileStatus;
        const path = fileMatch[2].trim();
        const file: ChangedFileNode = {
          status,
          path,
          filename: NodePathHelper.basename(path),
          added: fileMatch[3],
          deleted: fileMatch[4],
        };

        if (status === 'A' || status === '?') added++;
        else if (status === 'M') modified++;
        else if (status === 'D') deleted++;
        else if (status === 'R') renamed++;

        const targetTopic = currentTopic ?? UNCATEGORIZED_TOPIC;
        if (!topics.has(targetTopic)) {
          topics.set(targetTopic, {
            name: targetTopic,
            files: [],
            isUserCreated: targetTopic !== UNCATEGORIZED_TOPIC,
          });
        }
        topics.get(targetTopic)?.files.push(file);
      }
    }

    const sortedTopics = Array.from(topics.values()).sort((a, b) => {
      if (a.name === UNCATEGORIZED_TOPIC) return -1;
      if (b.name === UNCATEGORIZED_TOPIC) return 1;
      return a.name.localeCompare(b.name);
    });

    const filesCount = added + modified + deleted + renamed;
    const summaryParts: string[] = [];
    if (added > 0) summaryParts.push(`${added}A`);
    if (modified > 0) summaryParts.push(`${modified}M`);
    if (deleted > 0) summaryParts.push(`${deleted}D`);
    if (renamed > 0) summaryParts.push(`${renamed}R`);

    return {
      topics: sortedTopics,
      metadata: {
        filesCount,
        added,
        modified,
        deleted,
        renamed,
        summary: summaryParts.join(', '),
        isEmpty: filesCount === 0,
      },
    };
  }
}
