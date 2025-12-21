import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME } from '../../common/constants';
import type { PPConfig } from '../../common/schemas/types';

async function handleAddTool(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Tool name (used as identifier)',
    placeHolder: 'my-tool',
    validateInput: (value) => {
      if (!value) return 'Name is required';
      if (!/^[a-z0-9-]+$/.test(value)) return 'Name must contain only lowercase letters, numbers, and hyphens';
      return null;
    },
  });

  if (!name) return;

  const command = await vscode.window.showInputBox({
    prompt: 'Command to execute',
    placeHolder: 'bash script.sh',
  });

  if (!command) return;

  const description = await vscode.window.showInputBox({
    prompt: 'Description (optional)',
    placeHolder: 'What does this tool do?',
  });

  const group = await vscode.window.showInputBox({
    prompt: 'Group name (optional)',
    placeHolder: 'Development',
  });

  const configPath = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) {
    vscode.window.showErrorMessage(`Config file not found: ${configPath}`);
    return;
  }

  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON5.parse(configContent) as PPConfig;

  if (!config.tools) {
    config.tools = [];
  }

  const existingTool = config.tools.find((t) => t.name === name);
  if (existingTool) {
    vscode.window.showErrorMessage(`Tool "${name}" already exists`);
    return;
  }

  const newTool: NonNullable<PPConfig['tools']>[number] = {
    name,
    command,
  };

  if (group) {
    newTool.group = group;
  }

  config.tools.push(newTool);

  const toolsStartRegex = /"tools":\s*\[/;
  const toolsStartMatch = configContent.match(toolsStartRegex);

  if (!toolsStartMatch) {
    vscode.window.showErrorMessage('Could not find "tools" array in config file');
    return;
  }

  const startIndex = toolsStartMatch.index! + toolsStartMatch[0].length;
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

  const toolJson = JSON.stringify(newTool, null, 4)
    .split('\n')
    .map((line, idx) => {
      if (idx === 0) return `\n    ${line}`;
      return `    ${line}`;
    })
    .join('\n');

  const currentTools = configContent.substring(startIndex, endIndex).trim();
  const newToolsContent = currentTools ? `${currentTools},${toolJson}\n  ` : toolJson;

  const updatedContent = configContent.substring(0, startIndex) + newToolsContent + configContent.substring(endIndex);

  fs.writeFileSync(configPath, updatedContent, 'utf8');

  const toolDir = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, 'tools', name);
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }

  const instructionsPath = path.join(toolDir, 'instructions.md');
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

  vscode.window.showInformationMessage(`Tool "${name}" created successfully`);

  const openFile = await vscode.window.showQuickPick(
    [
      { label: 'Open instructions.md', value: 'instructions' },
      { label: 'Open config.jsonc', value: 'config' },
      { label: 'Done', value: 'done' },
    ],
    { placeHolder: 'What would you like to open?' },
  );

  if (openFile?.value === 'instructions') {
    const uri = vscode.Uri.file(instructionsPath);
    await vscode.window.showTextDocument(uri);
  } else if (openFile?.value === 'config') {
    const uri = vscode.Uri.file(configPath);
    await vscode.window.showTextDocument(uri);
  }
}

export function createAddToolCommand(): vscode.Disposable {
  return registerCommand(Command.AddTool, handleAddTool);
}
