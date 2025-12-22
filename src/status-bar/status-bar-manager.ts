import * as vscode from 'vscode';
import { ContextKey, isMultiRootWorkspace, setContextKey } from '../common/lib/vscode-utils';

export class StatusBarManager {
  private readonly statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  private statusBarBuffer: string[] = [];
  private registeredType: vscode.Disposable | null = null;

  public async enterCommandMode(): Promise<void> {
    this.statusBarItem.text = '/';
    this.statusBarItem.show();
    this.statusBarBuffer.push('/');

    await setContextKey(ContextKey.InCmdlineMode, true);

    this.registeredType = vscode.commands.registerCommand('type', async (e) => {
      if (e.text !== '\n') {
        this.statusBarBuffer.push(e.text);
        this.statusBarItem.text = this.statusBarBuffer.join('');
      } else {
        const tasks = await vscode.tasks.fetchTasks();
        this.statusBarBuffer.shift();
        const _task = tasks.filter((t) => t.name === this.statusBarBuffer.join(''));

        if (_task.length > 0) {
          void vscode.tasks.executeTask(_task[0]);
          await this.exitCommandMode();
        } else {
          await this.exitCommandMode();
          this.statusBarItem.text = '-- UNDEFINED TASK --';
        }
      }
    });
  }

  public async exitCommandMode(): Promise<void> {
    this.registeredType?.dispose();
    await setContextKey(ContextKey.InCmdlineMode, false);
    this.statusBarBuffer = [];
    this.statusBarItem.text = '';
  }

  public backspace(): void {
    if (this.statusBarBuffer.length > 1) {
      this.statusBarBuffer.pop();
      this.statusBarItem.text = this.statusBarBuffer.join('');
    }
  }

  public async showTaskList(): Promise<void> {
    const tasks_ = await vscode.tasks.fetchTasks();
    const tasks = tasks_.filter((t) => t.source === 'Workspace');
    const _part = this.statusBarBuffer.join('').replace('/', '');

    let _match: string | null = null;
    const _matches: string[] = [];
    let _matchCount = 0;

    for (const _task of tasks) {
      if (_task.name.startsWith(_part)) {
        if (_match == null) {
          _match = _task.name;
          _matchCount++;
        } else {
          _matchCount++;
        }

        if (isMultiRootWorkspace()) {
          let _workSpaceName = '';
          const folders = vscode.workspace.workspaceFolders!;
          if (typeof _task.scope === 'number') {
            _workSpaceName = folders[_task.scope].name;
          } else if (typeof _task.scope !== 'string') {
            _workSpaceName = (_task.scope as vscode.WorkspaceFolder).name;
          }
          _matches.push(`${_task.name} (${_workSpaceName})`);
        } else {
          _matches.push(`${_task.name}`);
        }
      }
    }

    if (_match != null && _matchCount === 1) {
      this.statusBarBuffer = ['/', ..._match.split('')];
      this.statusBarItem.text = this.statusBarBuffer.join('');
    } else if (_matchCount >= 2) {
      await setContextKey(ContextKey.InCmdlineMode, false);

      let _pick = await vscode.window.showQuickPick(_matches);
      if (_pick != null) {
        let _name = '';
        if (_pick.includes('(') && _pick.includes(')')) {
          const _rawTask = _pick.split(' ')[0];
          _name = _pick.split(' ')[1].replace('(', '').replace(')', '');
          _pick = _rawTask;
        } else {
          _name = _pick;
        }

        this.statusBarBuffer = ['/', ..._pick.split('')];
        this.statusBarItem.text = this.statusBarBuffer.join('');

        const tasks = await vscode.tasks.fetchTasks();
        this.statusBarBuffer.shift();

        let _task: vscode.Task[] = [];
        const folders = vscode.workspace.workspaceFolders;

        if (folders != null && folders.length > 1) {
          _task = tasks.filter((t) => {
            if (t.name !== this.statusBarBuffer.join('')) {
              return false;
            }

            if (typeof t.scope === 'number') {
              return folders[t.scope]?.name === _name;
            }
            if (typeof t.scope !== 'string') {
              return (t.scope as vscode.WorkspaceFolder).name === _name;
            }

            return false;
          });
        } else {
          _task = tasks.filter((t) => t.name === this.statusBarBuffer.join(''));
        }

        if (_task.length > 0) {
          void vscode.tasks.executeTask(_task[0]);
          await this.exitCommandMode();
        } else {
          await this.exitCommandMode();
          this.statusBarItem.text = '-- UNDEFINED TASK --';
        }
      }
    }
  }

  public dispose(): void {
    this.registeredType?.dispose();
    this.statusBarItem.dispose();
  }
}
