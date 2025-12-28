import { NO_GROUP_NAME } from '../../constants';

type GroupableItem = { group?: string };

export class GroupHelper {
  static groupItems<T extends GroupableItem>(items: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    for (const item of items) {
      const groupName = item.group ?? NO_GROUP_NAME;
      const group = grouped.get(groupName);
      if (group) {
        group.push(item);
      } else {
        grouped.set(groupName, [item]);
      }
    }

    return grouped;
  }

  static getGroupedOrFlat<T extends GroupableItem>(items: T[], isGrouped: boolean): Map<string, T[]> | null {
    if (!isGrouped) return null;
    return GroupHelper.groupItems(items);
  }
}
