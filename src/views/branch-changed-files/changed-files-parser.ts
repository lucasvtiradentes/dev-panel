import { BRANCH_CONTEXT_NO_CHANGES, MILESTONE_HEADER_PATTERN } from '../../common/constants';
import { createLogger } from '../../common/lib/logger';
import { NodePathHelper } from '../../common/utils/helpers/node-helper';
import type { ChangedFileNode, FileStatus, TopicNode } from './tree-items';

const logger = createLogger('ChangedFilesParser');

type ChangedFilesMetadata = {
  filesCount: number;
  added: number;
  modified: number;
  deleted: number;
  summary: string;
  isEmpty: boolean;
};

export type ParseResult = {
  topics: TopicNode[];
  metadata: ChangedFilesMetadata;
};

const FILE_LINE_REGEX = /^([AMD?])\s{2}(.+?)\s+\(([+-][\d-]+)\s([+-][\d-]+)\)$/;
const UNCATEGORIZED_TOPIC = 'Uncategorized';

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

      const fileMatch = trimmed.match(FILE_LINE_REGEX);
      if (!fileMatch && trimmed.length > 0 && /^[AMD?]\s/.test(trimmed)) {
        logger.warn(`[parseFromMarkdown] Line looks like a file but didn't match regex: "${trimmed}"`);
      }
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

    const filesCount = added + modified + deleted;
    const summaryParts: string[] = [];
    if (added > 0) summaryParts.push(`${added}A`);
    if (modified > 0) summaryParts.push(`${modified}M`);
    if (deleted > 0) summaryParts.push(`${deleted}D`);

    logger.info(`[parseFromMarkdown] Parsed ${filesCount} files: ${summaryParts.join(', ')}`);

    return {
      topics: sortedTopics,
      metadata: {
        filesCount,
        added,
        modified,
        deleted,
        summary: summaryParts.join(', '),
        isEmpty: filesCount === 0,
      },
    };
  }
}
