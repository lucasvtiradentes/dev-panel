import { getToolCommandId, getToolCommandPrefix } from '../../common/constants';
import { KeybindingManager } from '../common';

const manager = new KeybindingManager({
  commandPrefix: getToolCommandPrefix(),
  getCommandId: getToolCommandId,
});

export const getAllToolKeybindings = () => manager.getAllKeybindings();
export const reloadToolKeybindings = () => manager.reload();
