import { CLAUDE_DIR_NAME, SKILLS_DIR_NAME } from '../../../common/constants';
import { DocsGenerator } from '../../../common/utils/docs-generator';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';

async function handleGenerateToolsDocs() {
  const workspaceFolder = VscodeHelper.requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const skillsCount = await DocsGenerator.syncToSkills(workspaceFolder);
  const xml = DocsGenerator.generateToolsXml(workspaceFolder);
  DocsGenerator.syncToAiSpecs(xml, workspaceFolder);

  if (skillsCount > 0) {
    VscodeHelper.showToastMessage(
      ToastKind.Info,
      `Synced ${skillsCount} tool(s) to ${CLAUDE_DIR_NAME}/${SKILLS_DIR_NAME}/`,
    );
  }
}

export function createGenerateToolsDocsCommand(): Disposable {
  return registerCommand(Command.GenerateToolsDocs, handleGenerateToolsDocs);
}
