import {
  BRANCH_CONTEXT_NO_CHANGES,
  METADATA_SECTION,
  MILESTONE_HEADER_PATTERN,
  SECTION_NAME_CHANGED_FILES,
} from '../../../../common/constants';

const UNCATEGORIZED_TOPIC = 'Uncategorized';
const FILE_LINE_REGEX = /^([AMD])\s{2}(.+?)\s+\(([+-]\d+)\s([+-]\d+)\)$/;
const CHANGED_FILES_SECTION_REGEX = new RegExp(
  `# ${SECTION_NAME_CHANGED_FILES}\\s*\\n([\\s\\S]*?)(?=\\n#[^#]|\\n<!-- ${METADATA_SECTION}|$)`,
);

type ChangedFile = {
  status: string;
  path: string;
  added: string;
  deleted: string;
};

type TopicFiles = {
  name: string;
  files: ChangedFile[];
  isUserCreated: boolean;
};

export function parseExistingTopics(markdownContent: string): Map<string, TopicFiles> {
  const topics = new Map<string, TopicFiles>();
  const changedFilesMatch = markdownContent.match(CHANGED_FILES_SECTION_REGEX);

  if (!changedFilesMatch) {
    return topics;
  }

  const sectionContent = changedFilesMatch[1];
  const lines = sectionContent.split('\n');

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

    const fileMatch = trimmed.match(FILE_LINE_REGEX);
    if (fileMatch && currentTopic) {
      const file: ChangedFile = {
        status: fileMatch[1],
        path: fileMatch[2].trim(),
        added: fileMatch[3],
        deleted: fileMatch[4],
      };
      const topicData = topics.get(currentTopic);
      if (topicData) {
        topicData.files.push(file);
      }
    }
  }

  return topics;
}

export function parseGitChanges(gitContent: string): ChangedFile[] {
  if (gitContent === BRANCH_CONTEXT_NO_CHANGES) {
    return [];
  }

  const files: ChangedFile[] = [];
  const lines = gitContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(FILE_LINE_REGEX);
    if (match) {
      files.push({
        status: match[1],
        path: match[2].trim(),
        added: match[3],
        deleted: match[4],
      });
    }
  }

  return files;
}

export function mergeChangesWithTopics(
  gitFiles: ChangedFile[],
  existingTopics: Map<string, TopicFiles>,
): Map<string, TopicFiles> {
  const result = new Map<string, TopicFiles>();
  const gitFileMap = new Map(gitFiles.map((f) => [f.path, f]));
  const assignedFiles = new Set<string>();

  for (const [topicName, topic] of existingTopics) {
    const updatedFiles: ChangedFile[] = [];

    for (const existingFile of topic.files) {
      const gitFile = gitFileMap.get(existingFile.path);
      if (gitFile) {
        updatedFiles.push(gitFile);
        assignedFiles.add(existingFile.path);
      }
    }

    if (updatedFiles.length > 0 || topic.isUserCreated) {
      result.set(topicName, {
        name: topicName,
        files: updatedFiles,
        isUserCreated: topic.isUserCreated,
      });
    }
  }

  const uncategorizedFiles: ChangedFile[] = [];
  for (const gitFile of gitFiles) {
    if (!assignedFiles.has(gitFile.path)) {
      uncategorizedFiles.push(gitFile);
    }
  }

  if (uncategorizedFiles.length > 0) {
    const existing = result.get(UNCATEGORIZED_TOPIC);
    if (existing) {
      existing.files.push(...uncategorizedFiles);
    } else {
      result.set(UNCATEGORIZED_TOPIC, {
        name: UNCATEGORIZED_TOPIC,
        files: uncategorizedFiles,
        isUserCreated: false,
      });
    }
  }

  return result;
}

export function formatTopicsToMarkdown(topics: Map<string, TopicFiles>): string {
  if (topics.size === 0) {
    return BRANCH_CONTEXT_NO_CHANGES;
  }

  const allFiles: ChangedFile[] = [];
  for (const topic of topics.values()) {
    allFiles.push(...topic.files);
  }

  if (allFiles.length === 0) {
    return BRANCH_CONTEXT_NO_CHANGES;
  }

  const maxFileLength = Math.max(...allFiles.map((f) => f.path.length));
  const lines: string[] = [];

  const sortedTopics = Array.from(topics.entries()).sort((a, b) => {
    if (a[0] === UNCATEGORIZED_TOPIC) return 1;
    if (b[0] === UNCATEGORIZED_TOPIC) return -1;
    return a[0].localeCompare(b[0]);
  });

  for (const [topicName, topic] of sortedTopics) {
    if (topic.files.length === 0 && !topic.isUserCreated) {
      continue;
    }

    lines.push(`## ${topicName}`);

    const sortedFiles = [...topic.files].sort((a, b) => a.path.localeCompare(b.path));
    for (const file of sortedFiles) {
      const padding = ' '.repeat(Math.max(0, maxFileLength - file.path.length + 1));
      lines.push(`${file.status}  ${file.path}${padding}(${file.added} ${file.deleted})`);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

export function hasUserDefinedTopics(existingTopics: Map<string, TopicFiles>): boolean {
  for (const [name, topic] of existingTopics) {
    if (name !== UNCATEGORIZED_TOPIC && topic.isUserCreated) {
      return true;
    }
  }
  return false;
}
