import { ChangedFilesFormatter, type ChangedFilesTopic } from '../../common/core';
import { type BranchChangedFilesTreeItem, ChangedFileItem, TopicGroupItem } from './tree-items';

type TopicNode = ChangedFilesTopic;

export class ChangedFilesTreeBuilder {
  static buildGroupedTree(topics: TopicNode[]): TopicGroupItem[] {
    return topics.filter((topic) => topic.files.length > 0).map((topic) => new TopicGroupItem(topic));
  }

  static buildFlatTree(topics: TopicNode[]): ChangedFileItem[] {
    const allFiles = topics.flatMap((topic) => topic.files);
    const sortedFiles = ChangedFilesFormatter.sortFiles(allFiles);
    return sortedFiles.map((file) => new ChangedFileItem(file));
  }

  static buildTopicChildren(topic: TopicNode): ChangedFileItem[] {
    const sortedFiles = ChangedFilesFormatter.sortFiles(topic.files);
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
