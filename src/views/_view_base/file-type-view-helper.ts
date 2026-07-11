import { FileIOHelper } from '../../common/utils/helpers/node-helper';
import type { TreeItem } from '../../common/vscode/vscode-types';
import { FileTypeGroupTreeItem } from './file-type-group-tree-item';

type WorkspaceFileTypeEntry = {
  name: string;
  pattern: string;
  isDirectory: boolean;
};

export class FileTypeViewHelper {
  static getWorkspaceEntries(workspace: string): WorkspaceFileTypeEntry[] {
    return FileIOHelper.readDirectory(workspace, { withFileTypes: true }).map((entry) => {
      const isDirectory = FileIOHelper.isDirectoryEntry(workspace, entry);
      return {
        name: entry.name,
        pattern: isDirectory ? `${entry.name}/` : entry.name,
        isDirectory,
      };
    });
  }

  static groupItems<T extends TreeItem>(items: T[], isDirectory: (item: T) => boolean): TreeItem[] {
    const folders = items.filter(isDirectory);
    const files = items.filter((item) => !isDirectory(item));
    return [
      ...(folders.length > 0 ? [new FileTypeGroupTreeItem('Folders', folders)] : []),
      ...(files.length > 0 ? [new FileTypeGroupTreeItem('Files', files)] : []),
    ];
  }
}
