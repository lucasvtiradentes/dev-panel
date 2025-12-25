import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  CONFIG_SCHEMA_PATH,
  DEFAULT_AI_PROVIDER,
  DEFAULT_EXCLUDES,
  EXTENSION_DISPLAY_NAME,
  PROMPTS_DIR_NAME,
} from '../../common/constants';
import { BRANCH_CONTEXT_TEMPLATE_FILENAME } from '../../common/constants/scripts-constants';
import { getWorkspaceConfigDirPath, getWorkspaceConfigFilePath } from '../../common/lib/config-manager';
import { logger } from '../../common/lib/logger';
import { requireWorkspaceFolder } from '../../common/utils/workspace-utils';
import { DEFAULT_TEMPLATE } from '../../views/branch-context/default-template';

const INIT_CONFIG_CONTENT = `{
  "$schema": "${CONFIG_SCHEMA_PATH}",
  "settings": {
    "aiProvider": "${DEFAULT_AI_PROVIDER}",
    "exclude": ${JSON.stringify([`**/${CONFIG_DIR_NAME}/**`, ...DEFAULT_EXCLUDES], null, 4).replace(/\n/g, '\n    ')}
  },
  "variables": [
    {
      "name": "environment",
      "kind": "choose",
      "options": ["dev", "staging", "prod"],
      "description": "Select target environment",
      "default": "dev"
    }
  ],
  "replacements": [
    {
      "name": "enable-debug",
      "type": "patch",
      "description": "Enable debug mode",
      "target": "src/index.ts",
      "patches": [
        {
          "search": "const DEBUG = false;",
          "replace": "const DEBUG = true;"
        }
      ]
    }
  ],
  "tasks": [
    {
      "name": "hello",
      "command": "echo 'Hello from Project Panel!'",
      "group": "Utils"
    }
  ],
  "tools": [],
  "prompts": [
    {
      "name": "code-review",
      "file": "${PROMPTS_DIR_NAME}/code-review.md",
      "description": "Review code changes in current branch"
    }
  ]
}
`;

const SAMPLE_PROMPT_CONTENT = `Review the code changes in the current branch and provide feedback on:

- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Suggestions for improvement
`;

export async function showInitMenu(): Promise<void> {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  try {
    const configDirPath = getWorkspaceConfigDirPath(workspaceFolder);
    const configFilePath = getWorkspaceConfigFilePath(workspaceFolder, CONFIG_FILE_NAME);
    const promptsDirPath = vscode.Uri.joinPath(vscode.Uri.file(configDirPath), PROMPTS_DIR_NAME);
    const samplePromptPath = vscode.Uri.joinPath(promptsDirPath, 'code-review.md');
    const templatePath = vscode.Uri.joinPath(vscode.Uri.file(configDirPath), BRANCH_CONTEXT_TEMPLATE_FILENAME);

    await vscode.workspace.fs.createDirectory(vscode.Uri.file(configDirPath));
    await vscode.workspace.fs.createDirectory(promptsDirPath);

    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(configFilePath), encoder.encode(INIT_CONFIG_CONTENT));
    await vscode.workspace.fs.writeFile(samplePromptPath, encoder.encode(SAMPLE_PROMPT_CONTENT));
    await vscode.workspace.fs.writeFile(templatePath, encoder.encode(DEFAULT_TEMPLATE));

    logger.info('Project Panel initialized successfully');
    void vscode.window.showInformationMessage(
      `${EXTENSION_DISPLAY_NAME} initialized! Config created at ${CONFIG_FILE_NAME}`,
    );

    const openConfig = await vscode.window.showInformationMessage('Open config file?', 'Open', 'Later');

    if (openConfig === 'Open') {
      const doc = await vscode.workspace.openTextDocument(configFilePath);
      await vscode.window.showTextDocument(doc);
    }
  } catch (error) {
    logger.error(`Failed to initialize Project Panel: ${error}`);
    void vscode.window.showErrorMessage(`Failed to initialize: ${error}`);
  }
}
