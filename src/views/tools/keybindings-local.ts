import { getToolCommandId, getToolCommandPrefix } from '../../common';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getToolCommandPrefix(),
  getCommandId: getToolCommandId,
});

export const getToolKeybinding = (name: string) => manager.getKeybinding(name);
export const getAllToolKeybindings = () => manager.getAllKeybindings();
