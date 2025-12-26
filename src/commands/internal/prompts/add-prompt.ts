import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  CONFIG_FILE_NAME,
  CONFIG_INDENT,
  CONFIG_PROMPTS_ARRAY_PATTERN,
  JSON_INDENT_SPACES,
  PROMPTS_DIR_NAME,
  TOOL_NAME_PATTERN,
  TOOL_NAME_VALIDATION_MESSAGE,
} from '../../../common/constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath, parseConfig } from '../../../common/lib/config-manager';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import type { DevPanelConfig } from '../../../common/schemas';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';

async function handleAddPrompt() {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Prompt name (used as identifier)',
    placeHolder: 'My Prompt',
    validateInput: (value) => {
      if (!value) return 'Name is required';
      return null;
    },
  });

  if (!name) return;

  const fileName = await vscode.window.showInputBox({
    prompt: 'File name (without extension)',
    placeHolder: name,
    value: name,
    validateInput: (value) => {
      if (!value) return 'File name is required';
      if (!TOOL_NAME_PATTERN.test(value)) return TOOL_NAME_VALIDATION_MESSAGE;
      return null;
    },
  });

  if (!fileName) return;

  const description = await vscode.window.showInputBox({
    prompt: 'Description (optional)',
    placeHolder: 'What does this prompt do?',
  });

  const group = await vscode.window.showInputBox({
    prompt: 'Group name (optional)',
    placeHolder: 'Development',
  });

  const configPath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Config file not found: ${configPath}`);
    return;
  }

  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = parseConfig(configContent);
  if (!config) {
    VscodeHelper.showToastMessage(ToastKind.Error, 'Failed to parse config file');
    return;
  }

  if (!config.prompts) {
    config.prompts = [];
  }

  const existingPrompt = config.prompts.find((p) => p.name === name);
  if (existingPrompt) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Prompt "${name}" already exists`);
    return;
  }

  const newPrompt: NonNullable<DevPanelConfig['prompts']>[number] = {
    name,
    file: `${PROMPTS_DIR_NAME}/${fileName}.md`,
  };

  if (description) {
    newPrompt.description = description;
  }

  if (group) {
    newPrompt.group = group;
  }

  config.prompts.push(newPrompt);

  const promptsStartMatch = configContent.match(CONFIG_PROMPTS_ARRAY_PATTERN);

  if (!promptsStartMatch || promptsStartMatch.index === undefined) {
    VscodeHelper.showToastMessage(ToastKind.Error, 'Could not find "prompts" array in config file');
    return;
  }

  const matchIndex = promptsStartMatch.index;
  const startIndex = matchIndex + promptsStartMatch[0].length;
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

  const promptJson = JSON.stringify(newPrompt, null, JSON_INDENT_SPACES)
    .split('\n')
    .map((line, idx) => {
      if (idx === 0) return `\n${CONFIG_INDENT}${line}`;
      return `${CONFIG_INDENT}${line}`;
    })
    .join('\n');

  const currentPrompts = configContent.substring(startIndex, endIndex).trim();
  const newPromptsContent = currentPrompts ? `${currentPrompts},${promptJson}\n  ` : promptJson;

  const updatedContent = configContent.substring(0, startIndex) + newPromptsContent + configContent.substring(endIndex);

  fs.writeFileSync(configPath, updatedContent, 'utf8');

  const workspaceConfigDir = getWorkspaceConfigDirPath(workspaceFolder);
  const promptsDir = path.join(workspaceConfigDir, PROMPTS_DIR_NAME);
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
  }

  const promptFilePath = path.join(promptsDir, `${fileName}.md`);
  const promptContent = `# ${name}

${description || `Prompt: ${name}`}

## Instructions

- Instruction 1
- Instruction 2

## Context

Add context here...

## Example

\`\`\`bash
Example command or code
\`\`\`
`;

  fs.writeFileSync(promptFilePath, promptContent, 'utf8');

  VscodeHelper.showToastMessage(ToastKind.Info, `Prompt "${name}" created successfully`);

  const uri = vscode.Uri.file(promptFilePath);
  await vscode.window.showTextDocument(uri);
}

export function createAddPromptCommand(): Disposable {
  return registerCommand(Command.AddPrompt, handleAddPrompt);
}
