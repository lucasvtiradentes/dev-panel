import {
  CliPathHelper,
  FileIOHelper,
  NodeOsHelper,
  NodePathHelper,
  ShellHelper,
} from '../../../common/utils/helpers/node-helper';
import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

const getCursorAgentPath = () => CliPathHelper.resolvePath('cursor-agent');

export const cursorAgentProvider: PromptProvider = {
  name: 'Cursor Agent',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const tempFile = NodePathHelper.join(NodeOsHelper.tmpdir(), `devpanel-prompt-${Date.now()}.txt`);
    FileIOHelper.writeFile(tempFile, promptContent);
    const cursorAgentPath = getCursorAgentPath();
    const mainCmd = `"${cursorAgentPath}" < "${tempFile}"`;
    const cleanupCmd = ShellHelper.getDeleteCommand(tempFile);
    terminal.sendText(ShellHelper.buildChainedCommand(mainCmd, cleanupCmd));
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    const cursorAgentPath = getCursorAgentPath();
    return `"${cursorAgentPath}" < "${tempFile}" > "${outputFile}"`;
  },
};
