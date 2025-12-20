import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common';
import { TaskSource } from '../../common/types';
import { getExcludedDirs } from '../../views/tasks/package-json';
import { getCurrentSource } from '../../views/tasks/state';

async function findAllPackageJsons(folder: vscode.WorkspaceFolder): Promise<string[]> {
  const packageJsons: string[] = [];
  const excludedDirs = getExcludedDirs(folder.uri.fsPath);

  async function scan(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (excludedDirs.has(entry.name) || entry.name.startsWith('dist-')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.name === 'package.json') {
        packageJsons.push(fullPath);
      }
    }
  }

  await scan(folder.uri.fsPath);
  return packageJsons;
}

async function openPackageJsonAtScripts(packageJsonPath: string): Promise<void> {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  const lines = content.split('\n');
  let scriptsLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/"scripts"\s*:\s*\{/)) {
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
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return;

    const workspacePath = workspace.uri.fsPath;

    switch (source) {
      case TaskSource.VSCode: {
        const tasksJsonPath = path.join(workspacePath, '.vscode', 'tasks.json');
        if (fs.existsSync(tasksJsonPath)) {
          const uri = vscode.Uri.file(tasksJsonPath);
          await vscode.window.showTextDocument(uri);
        } else {
          void vscode.window.showErrorMessage('.vscode/tasks.json not found');
        }
        break;
      }

      case TaskSource.BPM: {
        const bpmConfigPath = path.join(workspacePath, '.bpm', 'config.jsonc');
        if (fs.existsSync(bpmConfigPath)) {
          const content = fs.readFileSync(bpmConfigPath, 'utf-8');
          const lines = content.split('\n');
          let scriptsLine = 0;

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/"scripts"\s*:\s*\[/)) {
              scriptsLine = i;
              break;
            }
          }

          const uri = vscode.Uri.file(bpmConfigPath);
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(scriptsLine, 0, scriptsLine, 0),
          });
        } else {
          void vscode.window.showErrorMessage('.bpm/config.jsonc not found');
        }
        break;
      }

      case TaskSource.Package: {
        const packageJsons = await findAllPackageJsons(workspace);

        if (packageJsons.length === 0) {
          void vscode.window.showErrorMessage('No package.json found');
        } else if (packageJsons.length === 1) {
          await openPackageJsonAtScripts(packageJsons[0]);
        } else {
          const items = packageJsons.map((pkgPath) => ({
            label: path.relative(workspacePath, pkgPath),
            path: pkgPath,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select package.json to open',
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
