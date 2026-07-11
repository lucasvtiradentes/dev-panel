import { NO_GROUP_NAME } from '../../common/constants';
import { GroupTreeItem, type TreeTask } from './items';

type ScriptPath = { top: string; sub: string | null; task: string };

function extractGroupPath(name: string, allNames: string[]): ScriptPath {
  const parts = name.split(':');

  if (parts.length === 1) {
    const hasRelated = allNames.some((n) => n.startsWith(`${name}:`));
    return hasRelated ? { top: name, sub: null, task: name } : { top: NO_GROUP_NAME, sub: null, task: name };
  }

  if (parts.length === 2) {
    return { top: parts[0], sub: null, task: parts[1] };
  }

  return { top: parts[0], sub: parts[1], task: parts.slice(2).join(':') };
}

export function buildPrefixGroupTree<TItem>(
  items: Iterable<[string, TItem]>,
  allNames: string[],
  createTask: (name: string, item: TItem, displayName: string) => TreeTask | null,
): Array<TreeTask | GroupTreeItem> {
  const taskElements: Array<TreeTask | GroupTreeItem> = [];
  const topGroups: Record<string, GroupTreeItem> = {};
  const subGroups: Record<string, GroupTreeItem> = {};

  for (const [name, item] of items) {
    const path = extractGroupPath(name, allNames);
    const treeTask = createTask(name, item, path.task);
    if (!treeTask) continue;

    let topGroup = topGroups[path.top];
    if (!topGroup) {
      topGroup = new GroupTreeItem(path.top);
      topGroups[path.top] = topGroup;
      taskElements.push(topGroup);
    }

    if (path.sub === null) {
      topGroup.children.push(treeTask);
      continue;
    }

    const subKey = `${path.top}/${path.sub}`;
    let subGroup = subGroups[subKey];
    if (!subGroup) {
      subGroup = new GroupTreeItem(path.sub);
      subGroups[subKey] = subGroup;
      topGroup.children.push(subGroup);
    }
    subGroup.children.push(treeTask);
  }

  return taskElements;
}
