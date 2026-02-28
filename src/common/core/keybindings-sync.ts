import { hasWorkspaceIdWhen, isDevPanelCommand } from '../constants/functions';
import { createLogger } from '../lib/logger';
import { KeybindingsHelper } from '../utils/helpers/keybindings-helper';
import { TypeGuardsHelper } from '../utils/helpers/type-guards-helper';
import { Command, executeCommand } from '../vscode/vscode-commands';
import { getVSCodeKeybindingsPath } from '../vscode/vscode-keybindings-utils';
import { buildWorkspaceWhenClause, getWorkspaceId } from '../vscode/vscode-workspace';

const logger = createLogger('KeybindingsSync');

export function syncKeybindings() {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    logger.info('syncKeybindings: No workspaceId, skipping');
    return;
  }

  const keybindingsPath = getVSCodeKeybindingsPath();
  const keybindings = KeybindingsHelper.load(keybindingsPath);
  const expectedWhen = buildWorkspaceWhenClause(workspaceId);

  let modified = false;

  for (const kb of keybindings) {
    if (typeof kb.command !== 'string') continue;
    if (!isDevPanelCommand(kb.command)) continue;
    if (hasWorkspaceIdWhen(kb.when)) continue;

    logger.info(`Patching: ${kb.command}`);
    kb.when = expectedWhen;
    modified = true;
  }

  if (!modified) {
    logger.info('syncKeybindings: No keybindings to patch');
    return;
  }

  try {
    KeybindingsHelper.save(keybindingsPath, keybindings);
    logger.info('syncKeybindings: Done');
  } catch (error: unknown) {
    logger.error(`syncKeybindings: Failed: ${TypeGuardsHelper.getErrorMessage(error)}`);
  }
}

export async function openKeybindingsForCommand(commandId: string) {
  await executeCommand(Command.VscodeOpenGlobalKeybindings, `@command:${commandId}`);
}

export async function openKeybindingsWithPrefix(prefix: string) {
  await executeCommand(Command.VscodeOpenGlobalKeybindings, prefix);
}
