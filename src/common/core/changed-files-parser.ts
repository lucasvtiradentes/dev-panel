import {
  BRANCH_CONTEXT_NO_CHANGES,
  CHANGED_FILE_LINE_PATTERN,
  GitFileStatus,
  MILESTONE_HEADER_PATTERN,
  UNCATEGORIZED_TOPIC,
} from '../constants';
import { NodePathHelper } from '../utils/helpers/node-helper';
import {
  type ChangedFile,
  type ChangedFilesMetadata,
  type ChangedFilesModel,
  type ChangedFilesTopic,
  EMPTY_MODEL,
  type FileStatus,
} from './changed-files-model';

export class ChangedFilesParser {
  static parseMarkdown(content: string | undefined): ChangedFilesModel {
    if (!content || content === BRANCH_CONTEXT_NO_CHANGES) {
      return EMPTY_MODEL;
    }

    const topicsMap = new Map<string, ChangedFilesTopic>();
    const allFiles: ChangedFile[] = [];
    const lines = content.split('\n');
    let currentTopic: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '```') continue;

      const topicMatch = trimmed.match(MILESTONE_HEADER_PATTERN);
      if (topicMatch) {
        currentTopic = topicMatch[1].trim();
        if (!topicsMap.has(currentTopic)) {
          topicsMap.set(currentTopic, { name: currentTopic, files: [], isUserCreated: true });
        }
        continue;
      }

      const fileMatch = trimmed.match(CHANGED_FILE_LINE_PATTERN);
      if (fileMatch) {
        const file: ChangedFile = {
          status: fileMatch[1] as FileStatus,
          path: fileMatch[2].trim(),
          filename: NodePathHelper.basename(fileMatch[2].trim()),
          added: fileMatch[3],
          deleted: fileMatch[4],
        };
        allFiles.push(file);

        const targetTopic = currentTopic ?? UNCATEGORIZED_TOPIC;
        if (!topicsMap.has(targetTopic)) {
          topicsMap.set(targetTopic, {
            name: targetTopic,
            files: [],
            isUserCreated: targetTopic !== UNCATEGORIZED_TOPIC,
          });
        }
        topicsMap.get(targetTopic)?.files.push(file);
      }
    }

    const topics = Array.from(topicsMap.values());
    const metadata = ChangedFilesParser.computeMetadata(allFiles);

    return { topics, metadata };
  }

  static parseMarkdownToMap(content: string | undefined): Map<string, ChangedFilesTopic> {
    if (!content || content === BRANCH_CONTEXT_NO_CHANGES) {
      return new Map();
    }

    const topicsMap = new Map<string, ChangedFilesTopic>();
    const lines = content.split('\n');
    let currentTopic: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '```') continue;

      const topicMatch = trimmed.match(MILESTONE_HEADER_PATTERN);
      if (topicMatch) {
        currentTopic = topicMatch[1].trim();
        if (!topicsMap.has(currentTopic)) {
          topicsMap.set(currentTopic, { name: currentTopic, files: [], isUserCreated: true });
        }
        continue;
      }

      const fileMatch = trimmed.match(CHANGED_FILE_LINE_PATTERN);
      if (fileMatch) {
        const file: ChangedFile = {
          status: fileMatch[1] as FileStatus,
          path: fileMatch[2].trim(),
          filename: NodePathHelper.basename(fileMatch[2].trim()),
          added: fileMatch[3],
          deleted: fileMatch[4],
        };

        const targetTopic = currentTopic ?? UNCATEGORIZED_TOPIC;
        if (!topicsMap.has(targetTopic)) {
          topicsMap.set(targetTopic, {
            name: targetTopic,
            files: [],
            isUserCreated: targetTopic !== UNCATEGORIZED_TOPIC,
          });
        }
        topicsMap.get(targetTopic)?.files.push(file);
      }
    }

    return topicsMap;
  }

  static parseFileLines(content: string): ChangedFile[] {
    if (!content || content === BRANCH_CONTEXT_NO_CHANGES) {
      return [];
    }

    const files: ChangedFile[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '```') continue;

      const fileMatch = trimmed.match(CHANGED_FILE_LINE_PATTERN);
      if (fileMatch) {
        files.push({
          status: fileMatch[1] as FileStatus,
          path: fileMatch[2].trim(),
          filename: NodePathHelper.basename(fileMatch[2].trim()),
          added: fileMatch[3],
          deleted: fileMatch[4],
        });
      }
    }

    return files;
  }

  static hasUserDefinedTopics(topics: Map<string, ChangedFilesTopic>): boolean {
    for (const [name, topic] of topics) {
      if (name !== UNCATEGORIZED_TOPIC && topic.isUserCreated) {
        return true;
      }
    }
    return false;
  }

  static topicsMapToModel(topicsMap: Map<string, ChangedFilesTopic>): ChangedFilesModel {
    const topics = Array.from(topicsMap.values());
    const allFiles = topics.flatMap((t) => t.files);
    const metadata = ChangedFilesParser.computeMetadata(allFiles);
    return { topics, metadata };
  }

  static computeMetadata(files: ChangedFile[]): ChangedFilesMetadata {
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

    const filesCount = added + modified + deleted + renamed;
    const parts: string[] = [];
    if (added > 0) parts.push(`${added}A`);
    if (modified > 0) parts.push(`${modified}M`);
    if (deleted > 0) parts.push(`${deleted}D`);
    if (renamed > 0) parts.push(`${renamed}R`);

    return {
      filesCount,
      added,
      modified,
      deleted,
      renamed,
      summary: parts.length > 0 ? parts.join(', ') : '',
      isEmpty: filesCount === 0,
    };
  }
}
