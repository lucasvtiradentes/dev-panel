import * as fs from 'node:fs';
import {
  CONFIG_FILE_NAME,
  CONFIG_INDENT,
  CONFIG_TOOLS_ARRAY_PATTERN,
  JSON_INDENT_SPACES,
  TOOL_INSTRUCTIONS_FILE,
  TOOL_NAME_PATTERN,
  TOOL_NAME_VALIDATION_MESSAGE,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import type { DevPanelConfig } from '../../../common/schemas';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';

async function handleAddTool() {
  const workspaceFolder = requireWorkspaceFolder();
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
  if (!fs.existsSync(configPath)) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Config file not found: ${configPath}`);
    return;
  }

  const configContent = fs.readFileSync(configPath, 'utf8');
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
  let bracketCount = 1;
  let endIndex = startIndex;

  for (let i = startIndex; i < configContent.length; i++) {
    if (configContent[i] === '[') bracketCount++;
    if (configContent[i] === ']') bracketCount--;
    if (bracketCount === 0) {
      endIndex = i;
      break;
    }
  }

  const toolJson = JSON.stringify(newTool, null, JSON_INDENT_SPACES)
    .split('\n')
    .map((line, idx) => {
      if (idx === 0) return `\n${CONFIG_INDENT}${line}`;
      return `${CONFIG_INDENT}${line}`;
    })
    .join('\n');

  const currentTools = configContent.substring(startIndex, endIndex).trim();
  const newToolsContent = currentTools ? `${currentTools},${toolJson}\n  ` : toolJson;

  const updatedContent = configContent.substring(0, startIndex) + newToolsContent + configContent.substring(endIndex);

  fs.writeFileSync(configPath, updatedContent, 'utf8');

  const toolDir = ConfigManager.getWorkspaceToolDir(workspaceFolder, name);
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }

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

  fs.writeFileSync(instructionsPath, instructionsContent, 'utf8');

  VscodeHelper.showToastMessage(ToastKind.Info, `Tool "${name}" created successfully`);

  const openFile = await VscodeHelper.showQuickPickItems(
    [
      { label: `Open ${TOOL_INSTRUCTIONS_FILE}`, value: 'instructions' },
      { label: `Open ${CONFIG_FILE_NAME}`, value: 'config' },
      { label: 'Done', value: 'done' },
    ],
    { placeHolder: 'What would you like to open?' },
  );

  if (openFile?.value === 'instructions') {
    const uri = VscodeHelper.createFileUri(instructionsPath);
    await VscodeHelper.openDocument(uri);
  } else if (openFile?.value === 'config') {
    const uri = VscodeHelper.createFileUri(configPath);
    await VscodeHelper.openDocument(uri);
  }
}

export function createAddToolCommand(): Disposable {
  return registerCommand(Command.AddTool, handleAddTool);
}
