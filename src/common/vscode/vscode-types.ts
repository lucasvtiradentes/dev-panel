import * as vscode from 'vscode';

export const ProcessExecutionClass = vscode.ProcessExecution;
export const ShellExecutionClass = vscode.ShellExecution;
export const TreeItemClass = vscode.TreeItem;

export type CancellationToken = vscode.CancellationToken;
export type Command = vscode.Command;
export type DataTransfer = vscode.DataTransfer;
export type Disposable = vscode.Disposable;
export type Event<T> = vscode.Event<T>;
export type EventEmitter<T> = vscode.EventEmitter<T>;
export type ExtensionContext = vscode.ExtensionContext;
export type FileSystemWatcher = vscode.FileSystemWatcher;
export type QuickPickItem = vscode.QuickPickItem;
export type QuickPickItemWithId<T> = QuickPickItem & { id: T };
export type StatusBarItem = vscode.StatusBarItem;
export type Task = vscode.Task;

export type ExtendedTask = Task & {
  presentationOptions?: {
    group?: string;
  };
};
export type TaskScope = vscode.TaskScope;
export type ThemeIcon = vscode.ThemeIcon;
export type TreeItem = vscode.TreeItem;
export type TreeItemCollapsibleState = vscode.TreeItemCollapsibleState;
export type TreeView<T> = vscode.TreeView<T>;
export type TreeDataProvider<T> = vscode.TreeDataProvider<T>;
export type TreeDragAndDropController<T> = vscode.TreeDragAndDropController<T>;
export type Uri = vscode.Uri;
export type WorkspaceFolder = vscode.WorkspaceFolder;
