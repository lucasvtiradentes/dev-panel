import { TASK_ITEM_PATTERN } from '../../../common/constants';
import type { TaskNode } from '../providers/interfaces';
import { formatTaskLine, parseStatusMarker, parseTaskText, statusToMarker } from './task-utils';

export function fromMarkdown(content: string): TaskNode[] {
  const lines = content.split('\n');
  const rootNodes: TaskNode[] = [];
  const stack: { node: TaskNode; indent: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const match = line.match(TASK_ITEM_PATTERN);
    if (!match) continue;

    const indent = Math.floor(match[1].length / 2);
    const status = parseStatusMarker(match[2]);
    const rawText = match[3];
    const { text, meta } = parseTaskText(rawText);

    const node: TaskNode = {
      text,
      status,
      lineIndex: i,
      children: [],
      meta,
    };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, indent });
  }

  return rootNodes;
}

export function toMarkdown(tasks: TaskNode[]): string {
  const lines: string[] = [];

  const renderNode = (node: TaskNode, indent = 0) => {
    const prefix = '  '.repeat(indent);
    const marker = statusToMarker(node.status);
    const taskContent = formatTaskLine(node.text, node.meta);
    lines.push(`${prefix}- [${marker}] ${taskContent}`);
    for (const child of node.children) {
      renderNode(child, indent + 1);
    }
  };

  for (const task of tasks) {
    renderNode(task);
  }
  return lines.join('\n');
}

export function fromMarkdownWithOffset(content: string, lineIndexBase: number): TaskNode[] {
  const lines = content.split('\n');
  const rootNodes: TaskNode[] = [];
  const stack: { node: TaskNode; indent: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const match = line.match(TASK_ITEM_PATTERN);
    if (!match) continue;

    const indent = Math.floor(match[1].length / 2);
    const status = parseStatusMarker(match[2]);
    const rawText = match[3];
    const { text, meta } = parseTaskText(rawText);

    const node: TaskNode = {
      text,
      status,
      lineIndex: lineIndexBase + i,
      children: [],
      meta,
    };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, indent });
  }

  return rootNodes;
}
