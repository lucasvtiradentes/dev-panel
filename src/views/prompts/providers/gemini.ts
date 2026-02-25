import {
  CliPathHelper,
  FileIOHelper,
  NodeOsHelper,
  NodePathHelper,
  ShellHelper,
} from '../../../common/utils/helpers/node-helper';
import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

const getGeminiPath = () => CliPathHelper.resolvePath('gemini');

export const geminiProvider: PromptProvider = {
  name: 'Gemini',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const tempFile = NodePathHelper.join(NodeOsHelper.tmpdir(), `devpanel-prompt-${Date.now()}.txt`);
    FileIOHelper.writeFile(tempFile, promptContent);
    const geminiPath = getGeminiPath();
    const mainCmd = `"${geminiPath}" < "${tempFile}"`;
    const cleanupCmd = ShellHelper.getDeleteCommand(tempFile);
    terminal.sendText(ShellHelper.buildChainedCommand(mainCmd, cleanupCmd));
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    const geminiPath = getGeminiPath();
    return `"${geminiPath}" < "${tempFile}" > "${outputFile}"`;
  },
};
