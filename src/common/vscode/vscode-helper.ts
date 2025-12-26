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
}
