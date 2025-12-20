import { getTaskCommandId, getTaskCommandPrefix } from '../../common';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getTaskCommandPrefix(),
  getCommandId: getTaskCommandId,
});

export const getTaskKeybinding = (name: string) => manager.getKeybinding(name);
export const getAllTaskKeybindings = () => manager.getAllKeybindings();
