import { CliPathHelper, FileIOHelper, NodeOsHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

const getGeminiPath = () => CliPathHelper.resolvePath('gemini');

export const geminiProvider: PromptProvider = {
  name: 'Gemini',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const tempFile = NodePathHelper.join(NodeOsHelper.tmpdir(), `devpanel-prompt-${Date.now()}.txt`);
    FileIOHelper.writeFile(tempFile, promptContent);
    const geminiPath = getGeminiPath();
    terminal.sendText(`"${geminiPath}" < "${tempFile}" && rm "${tempFile}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    const geminiPath = getGeminiPath();
    return `"${geminiPath}" < "${tempFile}" > "${outputFile}"`;
  },
};
