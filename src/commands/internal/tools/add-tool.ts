import {
  CONFIG_FILE_NAME,
  CONFIG_INDENT,
  CONFIG_TOOLS_ARRAY_PATTERN,
  JSON_INDENT_SPACES,
  TOOL_INSTRUCTIONS_FILE,
  TOOL_NAME_PATTERN,
  TOOL_NAME_VALIDATION_MESSAGE,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/core/config-manager';
import type { DevPanelConfig } from '../../../common/schemas';
import { findClosingBracketIndex } from '../../../common/utils/functions/find-closing-bracket';
import { JsonHelper } from '../../../common/utils/helpers/json-helper';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';

enum OpenFileOption {
  Instructions = 'instructions',
  Config = 'config',
  Done = 'done',
}

async function handleAddTool() {
  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const name = await VscodeHelper.showInputBox({
    prompt: 'Tool name (used as identifier)',
    placeHolder: 'my-tool',
    validateInput: (value) => {
      if (!value) return 'Name is required';
      if (!TOOL_NAME_PATTERN.test(value)) return TOOL_NAME_VALIDATION_MESSAGE;
      return null;
    },
  });

  if (!name) return;

  const command = await VscodeHelper.showInputBox({
    prompt: 'Command to execute',
    placeHolder: 'bash script.sh',
  });

  if (!command) return;

  const description = await VscodeHelper.showInputBox({
    prompt: 'Description (optional)',
    placeHolder: 'What does this tool do?',
  });

  const group = await VscodeHelper.showInputBox({
    prompt: 'Group name (optional)',
    placeHolder: 'Development',
  });

  const configPath = ConfigManager.getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  if (!FileIOHelper.fileExists(configPath)) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Config file not found: ${configPath}`);
    return;
  }

  const configContent = FileIOHelper.readFile(configPath);
  const config = ConfigManager.parseConfig(configContent);
  if (!config) {
    VscodeHelper.showToastMessage(ToastKind.Error, 'Failed to parse config file');
    return;
  }

  if (!config.tools) {
    config.tools = [];
  }

  const existingTool = config.tools.find((t) => t.name === name);
  if (existingTool) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Tool "${name}" already exists`);
    return;
  }

  const newTool: NonNullable<DevPanelConfig['tools']>[number] = {
    name,
    command,
  };

  if (group) {
    newTool.group = group;
  }

  config.tools.push(newTool);

  const toolsStartMatch = configContent.match(CONFIG_TOOLS_ARRAY_PATTERN);

  if (!toolsStartMatch || toolsStartMatch.index === undefined) {
    VscodeHelper.showToastMessage(ToastKind.Error, 'Could not find "tools" array in config file');
    return;
  }

  const matchIndex = toolsStartMatch.index;
  const startIndex = matchIndex + toolsStartMatch[0].length;
  const endIndex = findClosingBracketIndex(configContent, startIndex);

  const toolJson = JsonHelper.stringify(newTool, JSON_INDENT_SPACES)
    .split('\n')
    .map((line, idx) => {
      if (idx === 0) return `\n${CONFIG_INDENT}${line}`;
      return `${CONFIG_INDENT}${line}`;
    })
    .join('\n');

  const currentTools = configContent.substring(startIndex, endIndex).trim();
  const newToolsContent = currentTools ? `${currentTools},${toolJson}\n  ` : toolJson;

  const updatedContent = configContent.substring(0, startIndex) + newToolsContent + configContent.substring(endIndex);

  FileIOHelper.writeFile(configPath, updatedContent);

  const toolDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, name);
  FileIOHelper.ensureDirectoryExists(toolDir);

  const instructionsPath = ConfigManager.getWorkspaceToolInstructionsPath(workspaceFolder, name);
  const instructionsContent = `# Description

${description || `Tool: ${name}`}

# Features

- Feature 1
- Feature 2

# When to use it?

- Use case 1
- Use case 2

# Examples

\`\`\`bash
## Example command
${command}
\`\`\`

# Rules

- Rule 1
- Rule 2

# Notes

- Note 1
- Note 2

# Troubleshooting

- Issue 1: Solution 1
- Issue 2: Solution 2
`;

  FileIOHelper.writeFile(instructionsPath, instructionsContent);

  VscodeHelper.showToastMessage(ToastKind.Info, `Tool "${name}" created successfully`);

  const openFile = await VscodeHelper.showQuickPickItems(
    [
      { label: `Open ${TOOL_INSTRUCTIONS_FILE}`, value: OpenFileOption.Instructions },
      { label: `Open ${CONFIG_FILE_NAME}`, value: OpenFileOption.Config },
      { label: 'Done', value: OpenFileOption.Done },
    ],
    { placeHolder: 'What would you like to open?' },
  );

  if (openFile?.value === OpenFileOption.Instructions) {
    const uri = VscodeHelper.createFileUri(instructionsPath);
    await VscodeHelper.openDocument(uri);
  } else if (openFile?.value === OpenFileOption.Config) {
    const uri = VscodeHelper.createFileUri(configPath);
    await VscodeHelper.openDocument(uri);
  }
}

export function createAddToolCommand(): Disposable {
  return registerCommand(Command.AddTool, handleAddTool);
}
