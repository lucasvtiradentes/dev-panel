import {
  CliPathHelper,
  FileIOHelper,
  NodeOsHelper,
  NodePathHelper,
  ShellHelper,
} from '../../../common/utils/helpers/node-helper';
import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

const getClaudePath = () => CliPathHelper.resolvePath('claude');

export const claudeProvider: PromptProvider = {
  name: 'Claude',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const tempFile = NodePathHelper.join(NodeOsHelper.tmpdir(), `devpanel-prompt-${Date.now()}.txt`);
    FileIOHelper.writeFile(tempFile, promptContent);
    const claudePath = getClaudePath();
    const mainCmd = `"${claudePath}" --dangerously-skip-permissions < "${tempFile}"`;
    const cleanupCmd = ShellHelper.getDeleteCommand(tempFile);
    terminal.sendText(ShellHelper.buildChainedCommand(mainCmd, cleanupCmd));
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    const claudePath = getClaudePath();
    return `"${claudePath}" --dangerously-skip-permissions --print < "${tempFile}" > "${outputFile}"`;
  },
};
