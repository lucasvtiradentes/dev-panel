export const EXTENSION_PREFIX = 'taskOutlinePlus';
export const GLOBAL_STATE_WORKSPACE_SOURCE = '______taskRunnerPlusWorkspaceSource______';

export function getCommandId(command: string): string {
  return `${EXTENSION_PREFIX}.${command}`;
}
