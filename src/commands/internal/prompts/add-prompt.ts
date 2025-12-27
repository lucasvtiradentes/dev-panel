import * as path from 'node:path';
import {
  CONFIG_FILE_NAME,
  CONFIG_INDENT,
  CONFIG_PROMPTS_ARRAY_PATTERN,
  JSON_INDENT_SPACES,
  PROMPTS_DIR_NAME,
  TOOL_NAME_PATTERN,
  TOOL_NAME_VALIDATION_MESSAGE,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import type { DevPanelConfig } from '../../../common/schemas';
import { FileIOHelper } from '../../../common/utils/file-io';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';

async function handleAddPrompt() {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const name = await VscodeHelper.showInputBox({
    prompt: 'Prompt name (used as identifier)',
    placeHolder: 'My Prompt',
    validateInput: (value) => {
      if (!value) return 'Name is required';
      return null;
    },
  });

  if (!name) return;

  const fileName = await VscodeHelper.showInputBox({
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

  const description = await VscodeHelper.showInputBox({
    prompt: 'Description (optional)',
    placeHolder: 'What does this prompt do?',
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

  FileIOHelper.writeFile(configPath, updatedContent);

  const promptsDir = ConfigManager.getWorkspacePromptsDir(workspaceFolder);
  FileIOHelper.ensureDirectoryExists(promptsDir);

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

  FileIOHelper.writeFile(promptFilePath, promptContent);

  VscodeHelper.showToastMessage(ToastKind.Info, `Prompt "${name}" created successfully`);

  const uri = VscodeHelper.createFileUri(promptFilePath);
  await VscodeHelper.openDocument(uri);
}

export function createAddPromptCommand(): Disposable {
  return registerCommand(Command.AddPrompt, handleAddPrompt);
}
