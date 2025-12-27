import type * as vscode from 'vscode';

export type CancellationToken = vscode.CancellationToken;
export type Command = vscode.Command;
export type DataTransfer = vscode.DataTransfer;
export type Disposable = vscode.Disposable;
export type Event<T> = vscode.Event<T>;
export type EventEmitter<T> = vscode.EventEmitter<T>;
export type ExtensionContext = vscode.ExtensionContext;
export type FileSystemWatcher = vscode.FileSystemWatcher;
export type MarkdownString = vscode.MarkdownString;
type ProgressLocation = vscode.ProgressLocation;
export type QuickPickItem = vscode.QuickPickItem;
type QuickPickItemKind = vscode.QuickPickItemKind;
export type ShellExecution = vscode.ShellExecution;
export type StatusBarItem = vscode.StatusBarItem;
export type Task = vscode.Task;

export type ExtendedTask = Task & {
  presentationOptions?: {
    group?: string;
  };
};
type TaskPanelKind = vscode.TaskPanelKind;
type TaskRevealKind = vscode.TaskRevealKind;
export type TaskScope = vscode.TaskScope;
export type Terminal = vscode.Terminal;
export type ThemeIcon = vscode.ThemeIcon;
export type TreeItem = vscode.TreeItem;
export type TreeItemCollapsibleState = vscode.TreeItemCollapsibleState;
export type TreeView<T> = vscode.TreeView<T>;
export type TreeDataProvider<T> = vscode.TreeDataProvider<T>;
export type TreeDragAndDropController<T> = vscode.TreeDragAndDropController<T>;
export type Uri = vscode.Uri;
export type WorkspaceFolder = vscode.WorkspaceFolder;
