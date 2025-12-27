import * as vscode from 'vscode';
import type { VscodeColor, VscodeColorString, VscodeIcon, VscodeIconString } from './vscode-constants';
import type { ThemeIcon, TreeView, Uri } from './vscode-types';

export enum ToastKind {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export class VscodeHelper {
  static createIcon(icon: VscodeIcon, color?: VscodeColor): ThemeIcon {
    return color ? new vscode.ThemeIcon(icon, new vscode.ThemeColor(color)) : new vscode.ThemeIcon(icon);
  }

  static createCustomIcon(icon: VscodeIconString, color?: VscodeColorString): ThemeIcon {
    return color ? new vscode.ThemeIcon(icon, new vscode.ThemeColor(color)) : new vscode.ThemeIcon(icon);
  }

  static async openDocument(uri: Uri, options?: vscode.TextDocumentShowOptions): Promise<vscode.TextEditor> {
    return vscode.window.showTextDocument(uri, options);
  }

  static async openDocumentAtLine(uri: Uri, line: number): Promise<vscode.TextEditor> {
    return vscode.window.showTextDocument(uri, {
      selection: new vscode.Range(line, 0, line, 0),
    });
  }

  static showToastMessage(kind: ToastKind, message: string, ...items: string[]): Thenable<string | undefined>;
  static showToastMessage(
    kind: ToastKind,
    message: string,
    options: vscode.MessageOptions,
    ...items: string[]
  ): Thenable<string | undefined>;
  static showToastMessage(
    kind: ToastKind,
    message: string,
    optionsOrFirstItem?: vscode.MessageOptions | string,
    ...items: string[]
  ): Thenable<string | undefined> {
    const isOptions = typeof optionsOrFirstItem === 'object';
    const options = isOptions ? optionsOrFirstItem : undefined;
    const allItems = isOptions
      ? items
      : [optionsOrFirstItem as string, ...items].filter((item): item is string => item !== undefined);

    switch (kind) {
      case ToastKind.Info:
        return options
          ? vscode.window.showInformationMessage(message, options, ...allItems)
          : vscode.window.showInformationMessage(message, ...allItems);
      case ToastKind.Warning:
        return options
          ? vscode.window.showWarningMessage(message, options, ...allItems)
          : vscode.window.showWarningMessage(message, ...allItems);
      case ToastKind.Error:
        return options
          ? vscode.window.showErrorMessage(message, options, ...allItems)
          : vscode.window.showErrorMessage(message, ...allItems);
    }
  }

  static createTreeView<T>(viewId: string, options: vscode.TreeViewOptions<T>): TreeView<T> {
    return vscode.window.createTreeView(viewId, options);
  }

  static registerTreeDataProvider<T>(viewId: string, treeDataProvider: vscode.TreeDataProvider<T>): vscode.Disposable {
    return vscode.window.registerTreeDataProvider(viewId, treeDataProvider);
  }

  static fetchTasks(filter?: vscode.TaskFilter): Thenable<vscode.Task[]> {
    return vscode.tasks.fetchTasks(filter);
  }

  static showInputBox(
    options?: vscode.InputBoxOptions,
    token?: vscode.CancellationToken,
  ): Thenable<string | undefined> {
    return vscode.window.showInputBox(options, token);
  }

  static showQuickPick(
    items: readonly string[] | Thenable<readonly string[]>,
    options: vscode.QuickPickOptions & { canPickMany: true },
    token?: vscode.CancellationToken,
  ): Thenable<string[] | undefined>;
  static showQuickPick(
    items: readonly string[] | Thenable<readonly string[]>,
    options?: vscode.QuickPickOptions,
    token?: vscode.CancellationToken,
  ): Thenable<string | undefined>;
  static showQuickPick(
    items: readonly string[] | Thenable<readonly string[]>,
    options?: vscode.QuickPickOptions,
    token?: vscode.CancellationToken,
    // tscanner-ignore-next-line no-single-or-array-union
  ): Thenable<string | string[] | undefined> {
    return vscode.window.showQuickPick(items, options, token);
  }

  static showQuickPickItems<T extends vscode.QuickPickItem>(
    items: readonly T[] | Thenable<readonly T[]>,
    options: vscode.QuickPickOptions & { canPickMany: true },
    token?: vscode.CancellationToken,
  ): Thenable<T[] | undefined>;
  static showQuickPickItems<T extends vscode.QuickPickItem>(
    items: readonly T[] | Thenable<readonly T[]>,
    options?: vscode.QuickPickOptions,
    token?: vscode.CancellationToken,
  ): Thenable<T | undefined>;
  static showQuickPickItems<T extends vscode.QuickPickItem>(
    items: readonly T[] | Thenable<readonly T[]>,
    options?: vscode.QuickPickOptions,
    token?: vscode.CancellationToken,
    // tscanner-ignore-next-line no-single-or-array-union
  ): Thenable<T | T[] | undefined> {
    return vscode.window.showQuickPick(items, options, token);
  }

  static withProgress<R>(
    options: vscode.ProgressOptions,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken,
    ) => Thenable<R>,
  ): Thenable<R> {
    return vscode.window.withProgress(options, task);
  }

  static createStatusBarItem(alignment?: vscode.StatusBarAlignment, priority?: number): vscode.StatusBarItem {
    return vscode.window.createStatusBarItem(alignment, priority);
  }

  static createTerminal(options: vscode.TerminalOptions): vscode.Terminal {
    return vscode.window.createTerminal(options);
  }

  static createFileSystemWatcher(
    globPattern: vscode.GlobPattern,
    ignoreCreateEvents?: boolean,
    ignoreChangeEvents?: boolean,
    ignoreDeleteEvents?: boolean,
  ): vscode.FileSystemWatcher {
    return vscode.workspace.createFileSystemWatcher(
      globPattern,
      ignoreCreateEvents,
      ignoreChangeEvents,
      ignoreDeleteEvents,
    );
  }

  static async openExternal(url: string): Promise<boolean> {
    return vscode.env.openExternal(VscodeHelper.parseUri(url));
  }

  static async writeToClipboard(text: string) {
    return vscode.env.clipboard.writeText(text);
  }

  static createRelativePattern(base: string | vscode.WorkspaceFolder, pattern: string): vscode.RelativePattern {
    return new vscode.RelativePattern(base, pattern);
  }

  static createFileUri(path: string): vscode.Uri {
    return vscode.Uri.file(path);
  }

  static createShellExecution(commandLine: string, options?: vscode.ShellExecutionOptions): vscode.ShellExecution;
  static createShellExecution(
    command: string | vscode.ShellQuotedString,
    args: (string | vscode.ShellQuotedString)[],
    options?: vscode.ShellExecutionOptions,
  ): vscode.ShellExecution;
  static createShellExecution(
    commandOrCommandLine: string | vscode.ShellQuotedString,
    argsOrOptions?: (string | vscode.ShellQuotedString)[] | vscode.ShellExecutionOptions,
    options?: vscode.ShellExecutionOptions,
  ): vscode.ShellExecution {
    if (Array.isArray(argsOrOptions)) {
      return new vscode.ShellExecution(commandOrCommandLine, argsOrOptions, options);
    }
    return new vscode.ShellExecution(commandOrCommandLine as string, argsOrOptions);
  }

  static async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    return vscode.workspace.fs.readDirectory(uri);
  }

  static async createDirectory(uri: vscode.Uri) {
    return vscode.workspace.fs.createDirectory(uri);
  }

  static async readFile(uri: vscode.Uri) {
    return vscode.workspace.fs.readFile(uri);
  }

  static async writeFile(uri: vscode.Uri, content: Uint8Array) {
    return vscode.workspace.fs.writeFile(uri, content);
  }

  static async stat(uri: vscode.Uri) {
    return vscode.workspace.fs.stat(uri);
  }

  static async copy(source: vscode.Uri, target: vscode.Uri, options?: { overwrite?: boolean }) {
    return vscode.workspace.fs.copy(source, target, options);
  }

  static async delete(uri: vscode.Uri, options?: { recursive?: boolean; useTrash?: boolean }) {
    return vscode.workspace.fs.delete(uri, options);
  }

  static getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
    return vscode.workspace.workspaceFolders ?? [];
  }

  static getWorkspaceName(): string | undefined {
    return vscode.workspace.name;
  }

  static findFiles(
    include: vscode.GlobPattern,
    exclude?: vscode.GlobPattern | null,
    maxResults?: number,
    token?: vscode.CancellationToken,
  ): Thenable<vscode.Uri[]> {
    return vscode.workspace.findFiles(include, exclude, maxResults, token);
  }

  static asRelativePath(pathOrUri: string | vscode.Uri, includeWorkspaceFolder?: boolean): string {
    return vscode.workspace.asRelativePath(pathOrUri, includeWorkspaceFolder);
  }

  static getConfiguration(section?: string, scope?: vscode.ConfigurationScope | null): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section, scope);
  }

  static joinPath(base: vscode.Uri, ...pathSegments: string[]): vscode.Uri {
    return vscode.Uri.joinPath(base, ...pathSegments);
  }

  static parseUri(value: string): vscode.Uri {
    return vscode.Uri.parse(value);
  }

  static executeCommand<T = unknown>(command: string, ...args: unknown[]): Thenable<T> {
    return vscode.commands.executeCommand<T>(command, ...args);
  }

  static getExtension<T = unknown>(extensionId: string): vscode.Extension<T> | undefined {
    return vscode.extensions.getExtension<T>(extensionId);
  }

  static createTask(
    definition: vscode.TaskDefinition,
    scope: vscode.WorkspaceFolder | vscode.TaskScope.Global | vscode.TaskScope.Workspace,
    name: string,
    source: string,
    execution?: vscode.ProcessExecution | vscode.ShellExecution | vscode.CustomExecution,
    problemMatchers?: string | string[],
  ): vscode.Task {
    return new vscode.Task(definition, scope, name, source, execution, problemMatchers);
  }
}
