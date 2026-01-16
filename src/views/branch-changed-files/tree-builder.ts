import { type BranchChangedFilesTreeItem, ChangedFileItem, TopicGroupItem, type TopicNode } from './tree-items';

export class ChangedFilesTreeBuilder {
  static buildGroupedTree(topics: TopicNode[]): TopicGroupItem[] {
    return topics.filter((topic) => topic.files.length > 0).map((topic) => new TopicGroupItem(topic));
  }

  static buildFlatTree(topics: TopicNode[]): ChangedFileItem[] {
    const allFiles = topics.flatMap((topic) => topic.files);
    const sortedFiles = allFiles.sort((a, b) => a.path.localeCompare(b.path));
    return sortedFiles.map((file) => new ChangedFileItem(file));
  }

  static buildTopicChildren(topic: TopicNode): ChangedFileItem[] {
    const sortedFiles = [...topic.files].sort((a, b) => a.path.localeCompare(b.path));
    return sortedFiles.map((file) => new ChangedFileItem(file));
  }

  static getChildren(
    element: BranchChangedFilesTreeItem | undefined,
    topics: TopicNode[],
    grouped: boolean,
  ): BranchChangedFilesTreeItem[] {
    if (element instanceof TopicGroupItem) {
      return ChangedFilesTreeBuilder.buildTopicChildren(element.topic);
    }

    if (grouped) {
      return ChangedFilesTreeBuilder.buildGroupedTree(topics);
    }

    return ChangedFilesTreeBuilder.buildFlatTree(topics);
  }
}
