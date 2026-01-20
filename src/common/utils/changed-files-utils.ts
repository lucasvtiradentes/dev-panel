import {
  BRANCH_CONTEXT_NO_CHANGES,
  CHANGED_FILE_LINE_PATTERN,
  MILESTONE_HEADER_PATTERN,
  UNCATEGORIZED_TOPIC,
} from '../constants';

export type BaseChangedFile = {
  status: string;
  path: string;
  added: string;
  deleted: string;
};

export type ParsedTopic<T extends BaseChangedFile> = {
  name: string;
  files: T[];
  isUserCreated: boolean;
};

export class ChangedFilesUtils {
  static parseFileLines<T extends BaseChangedFile>(
    content: string,
    createFile: (status: string, path: string, added: string, deleted: string) => T,
  ): { topics: Map<string, ParsedTopic<T>>; files: T[] } {
    const topics = new Map<string, ParsedTopic<T>>();
    const allFiles: T[] = [];

    if (!content || content === BRANCH_CONTEXT_NO_CHANGES) {
      return { topics, files: allFiles };
    }

    const lines = content.split('\n');
    let currentTopic: string | null = null;

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
        const file = createFile(fileMatch[1], fileMatch[2].trim(), fileMatch[3], fileMatch[4]);
        allFiles.push(file);

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

    return { topics, files: allFiles };
  }

  static sortTopics<T extends ParsedTopic<BaseChangedFile>>(topics: T[]): T[] {
    return topics.sort((a, b) => {
      if (a.name === UNCATEGORIZED_TOPIC) return -1;
      if (b.name === UNCATEGORIZED_TOPIC) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  static sortTopicEntries<T>(entries: [string, T][]): [string, T][] {
    return entries.sort((a, b) => {
      if (a[0] === UNCATEGORIZED_TOPIC) return -1;
      if (b[0] === UNCATEGORIZED_TOPIC) return 1;
      return a[0].localeCompare(b[0]);
    });
  }
}
