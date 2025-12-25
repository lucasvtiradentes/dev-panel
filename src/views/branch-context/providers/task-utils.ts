import type { TaskMeta, TaskStatus } from './interfaces';

export function parseStatusMarker(marker: string): TaskStatus {
  const char = marker.toLowerCase();
  switch (char) {
    case 'x':
      return 'done';
    case '>':
      return 'doing';
    case '!':
      return 'blocked';
    default:
      return 'todo';
  }
}

export function statusToMarker(status: TaskStatus): string {
  switch (status) {
    case 'done':
      return 'x';
    case 'doing':
      return '>';
    case 'blocked':
      return '!';
    default:
      return ' ';
  }
}

export function createEmptyMeta(): TaskMeta {
  return {};
}

export function cycleStatus(currentStatus: TaskStatus): TaskStatus {
  const cycle: TaskStatus[] = ['todo', 'doing', 'done'];
  const idx = cycle.indexOf(currentStatus);
  if (idx === -1) return 'todo';
  return cycle[(idx + 1) % cycle.length];
}
