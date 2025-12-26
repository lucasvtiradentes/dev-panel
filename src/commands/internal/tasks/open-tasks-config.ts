import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  CONFIG_TASKS_ARRAY_PATTERN,
  DIST_DIR_PREFIX,
  PACKAGE_JSON,
  PACKAGE_JSON_SCRIPTS_PATTERN,
  VSCODE_DIR,
  VSCODE_TASKS_FILE,
  VSCODE_TASKS_PATH,
} from '../../../common/constants';
import { Command, registerCommand } from '../../../common/lib/vscode-utils';
import { TaskSource } from '../../../common/schemas/types';
import { TypeGuards } from '../../../common/utils/type-utils';
import { getFirstWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { WorkspaceFolder } from '../../../common/vscode/vscode-types';
import { getExcludedDirs } from '../../../views/tasks/package-json';
import { getCurrentSource } from '../../../views/tasks/state';

async function findAllPackageJsons(folder: WorkspaceFolder): Promise<string[]> {
  const packageJsons: string[] = [];
  const excludedDirs = getExcludedDirs(folder.uri.fsPath);

  async function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (excludedDirs.has(entry.name) || entry.name.startsWith(DIST_DIR_PREFIX)) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.name === PACKAGE_JSON) {
        packageJsons.push(fullPath);
      }
    }
  }

  await scan(folder.uri.fsPath);
  return packageJsons;
}

async function openPackageJsonAtScripts(packageJsonPath: string) {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  const lines = content.split('\n');
  let scriptsLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(PACKAGE_JSON_SCRIPTS_PATTERN)) {
      scriptsLine = i;
      break;
    }
  }

  const uri = vscode.Uri.file(packageJsonPath);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(scriptsLine, 0, scriptsLine, 0),
  });
}

export function createOpenTasksConfigCommand() {
  return registerCommand(Command.OpenTasksConfig, async () => {
    const source = getCurrentSource();
    const workspace = getFirstWorkspaceFolder();
    if (!workspace) return;

    const workspacePath = workspace.uri.fsPath;

    switch (source) {
      case TaskSource.VSCode: {
        const tasksJsonPath = path.join(workspacePath, VSCODE_DIR, VSCODE_TASKS_FILE);
        if (fs.existsSync(tasksJsonPath)) {
          const uri = vscode.Uri.file(tasksJsonPath);
          await vscode.window.showTextDocument(uri);
        } else {
          void VscodeHelper.showToastMessage(ToastKind.Error, `${VSCODE_TASKS_PATH} not found`);
        }
        break;
      }

      case TaskSource.DevPanel: {
        const configPath = path.join(workspacePath, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf-8');
          const lines = content.split('\n');
          let tasksLine = 0;

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(CONFIG_TASKS_ARRAY_PATTERN)) {
              tasksLine = i;
              break;
            }
          }

          const uri = vscode.Uri.file(configPath);
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(tasksLine, 0, tasksLine, 0),
          });
        } else {
          void VscodeHelper.showToastMessage(ToastKind.Error, `${CONFIG_DIR_NAME}/${CONFIG_FILE_NAME} not found`);
        }
        break;
      }

      case TaskSource.Package: {
        const packageJsons = await findAllPackageJsons(workspace);

        if (!TypeGuards.isNonEmptyArray(packageJsons)) {
          void VscodeHelper.showToastMessage(ToastKind.Error, `No ${PACKAGE_JSON} found`);
        } else if (packageJsons.length === 1) {
          await openPackageJsonAtScripts(packageJsons[0]);
        } else {
          const items = packageJsons.map((pkgPath) => ({
            label: path.relative(workspacePath, pkgPath),
            path: pkgPath,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select ${PACKAGE_JSON} to open`,
          });

          if (selected) {
            await openPackageJsonAtScripts(selected.path);
          }
        }
        break;
      }
    }
  });
}
