import { getPromptCommandId, getPromptCommandPrefix } from '../../common';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getPromptCommandPrefix(),
  getCommandId: getPromptCommandId,
});

export const getPromptKeybinding = (name: string) => manager.getKeybinding(name);
export const getAllPromptKeybindings = () => manager.getAllKeybindings();
