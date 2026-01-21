import { BRANCH_CONTEXT_NO_CHANGES, METADATA_SECTION_PREFIX, METADATA_SUFFIX } from '../constants';
import type { ChangedFile, ChangedFilesModel, ChangedFilesTopic } from './changed-files-model';

export class ChangedFilesFormatter {
  static formatToMarkdown(model: ChangedFilesModel): string {
    if (model.topics.length === 0) {
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const allFiles = model.topics.flatMap((t) => t.files);
    if (allFiles.length === 0) {
      return BRANCH_CONTEXT_NO_CHANGES;
    }

    const maxFileLength = Math.max(...allFiles.map((f) => f.path.length));
    const lines: string[] = [];

    for (const topic of model.topics) {
      if (topic.files.length === 0 && !topic.isUserCreated) {
        continue;
      }

      lines.push(`## ${topic.name}`);

      const sortedFiles = ChangedFilesFormatter.sortFiles(topic.files);
      for (const file of sortedFiles) {
        lines.push(ChangedFilesFormatter.formatFileLine(file, maxFileLength));
      }

      lines.push('');
    }

    return lines.join('\n').trim();
  }

  static formatToMarkdownWithMetadata(model: ChangedFilesModel, metadata: Record<string, unknown>): string {
    const content = ChangedFilesFormatter.formatToMarkdown(model);
    return `${content}\n\n${METADATA_SECTION_PREFIX}${JSON.stringify(metadata)}${METADATA_SUFFIX}`;
  }

  static formatFileLine(file: ChangedFile, maxFileLength: number): string {
    const padding = ' '.repeat(Math.max(0, maxFileLength - file.path.length + 1));
    return `${file.status}  ${file.path}${padding}(${file.added} ${file.deleted})`;
  }

  static sortFiles(files: ChangedFile[]): ChangedFile[] {
    return [...files].sort((a, b) => a.path.localeCompare(b.path));
  }

  static sortTopics(topics: ChangedFilesTopic[]): ChangedFilesTopic[] {
    return [...topics].sort((a, b) => a.name.localeCompare(b.name));
  }
}
