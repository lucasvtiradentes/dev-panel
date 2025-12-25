import { CONTEXT_PREFIX } from '../../common/constants';
import {
  type VSCodeKeybinding,
  loadKeybindings as loadVSCodeKeybindings,
} from '../../common/lib/vscode-keybindings-utils';
import { getWorkspaceId } from '../../common/lib/vscode-utils';
import type { KeybindingConfig } from './types';

export class KeybindingManager {
  private keybindings: VSCodeKeybinding[] = [];
  private workspaceId: string | null = null;

  constructor(private readonly config: KeybindingConfig) {
    this.loadKeybindings();
  }

  reload(): void {
    this.loadKeybindings();
  }

  private loadKeybindings(): void {
    this.keybindings = loadVSCodeKeybindings();
    this.workspaceId = getWorkspaceId();
  }

  private matchesWorkspace(kb: VSCodeKeybinding): boolean {
    if (!this.workspaceId) return !kb.when;
    return kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId == '${this.workspaceId}'`) ?? false;
  }

  getKeybinding(itemName: string): string | undefined {
    const commandId = this.config.getCommandId(itemName);
    const binding = this.keybindings.find((kb) => kb.command === commandId && this.matchesWorkspace(kb));
    return binding?.key;
  }

  getAllKeybindings(): Record<string, string> {
    const result: Record<string, string> = {};
    const prefix = this.config.commandPrefix;

    for (const kb of this.keybindings) {
      if (kb.command.startsWith(`${prefix}.`) && this.matchesWorkspace(kb)) {
        const itemName = kb.command.replace(`${prefix}.`, '');
        result[itemName] = kb.key;
      }
    }

    return result;
  }
}
