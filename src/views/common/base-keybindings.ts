import * as fs from 'node:fs';
import JSON5 from 'json5';
import { CONTEXT_PREFIX } from '../../common/constants';
import { getVSCodeKeybindingsPath } from '../../common/lib/vscode-keybindings-utils';
import { getWorkspaceId } from '../../common/lib/vscode-utils';
import type { KeybindingConfig } from './types';

type VSCodeKeybinding = { key: string; command: string; when?: string };

export class KeybindingManager {
  private keybindings: VSCodeKeybinding[] = [];
  private workspaceId: string | null = null;

  constructor(private readonly config: KeybindingConfig) {
    console.log(`[KeybindingManager] Creating manager for prefix: ${config.commandPrefix}`);
    this.loadKeybindings();
  }

  reload(): void {
    console.log(`[KeybindingManager] Reloading keybindings for prefix: ${this.config.commandPrefix}`);
    this.loadKeybindings();
  }

  private loadKeybindings(): void {
    const filePath = getVSCodeKeybindingsPath();
    console.log(`[KeybindingManager] Loading keybindings from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log('[KeybindingManager] Keybindings file does not exist');
      this.keybindings = [];
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.keybindings = content.trim() ? JSON5.parse(content) : [];
      console.log(`[KeybindingManager] Loaded ${this.keybindings.length} keybindings`);
    } catch (error) {
      console.error('[KeybindingManager] Error loading keybindings:', error);
      this.keybindings = [];
    }

    this.workspaceId = getWorkspaceId();
    console.log(`[KeybindingManager] Workspace ID: ${this.workspaceId}`);
  }

  private matchesWorkspace(kb: VSCodeKeybinding): boolean {
    if (!this.workspaceId) return !kb.when;
    return kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId == '${this.workspaceId}'`) ?? false;
  }

  getKeybinding(itemName: string): string | undefined {
    const commandId = this.config.getCommandId(itemName);
    const binding = this.keybindings.find((kb) => kb.command === commandId && this.matchesWorkspace(kb));
    console.log(
      `[KeybindingManager] getKeybinding("${itemName}") -> commandId: ${commandId}, found: ${binding?.key ?? 'none'}`,
    );
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

    console.log(`[KeybindingManager] getAllKeybindings() -> found ${Object.keys(result).length} keybindings`);
    return result;
  }
}
