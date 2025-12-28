import * as vscode from 'vscode';

export const VscodeConstants = {
  get TreeItemCollapsibleState() {
    return vscode.TreeItemCollapsibleState;
  },
  get TaskScope() {
    return vscode.TaskScope;
  },
  get ProgressLocation() {
    return vscode.ProgressLocation;
  },
  get TaskRevealKind() {
    return vscode.TaskRevealKind;
  },
  get TaskPanelKind() {
    return vscode.TaskPanelKind;
  },
  get QuickPickItemKind() {
    return vscode.QuickPickItemKind;
  },
  get FileType() {
    return vscode.FileType;
  },
  get ViewColumn() {
    return vscode.ViewColumn;
  },
  get StatusBarAlignment() {
    return vscode.StatusBarAlignment;
  },
};

export enum VscodeIcon {
  Account = 'account',
  Add = 'add',
  ArrowLeft = 'arrow-left',
  ArrowUp = 'arrow-up',
  Beaker = 'beaker',
  Check = 'check',
  Checklist = 'checklist',
  CircleFilled = 'circle-filled',
  CircleLargeOutline = 'circle-large-outline',
  Close = 'close',
  CommentDiscussion = 'comment-discussion',
  Diff = 'diff',
  Error = 'error',
  Extensions = 'extensions',
  EyeClosed = 'eye-closed',
  FileAdd = 'file-add',
  Flame = 'flame',
  Folder = 'folder',
  GitBranch = 'git-branch',
  GitPullRequest = 'git-pull-request',
  HeartFilled = 'heart-filled',
  Inbox = 'inbox',
  Link = 'link',
  LinkExternal = 'link-external',
  Milestone = 'milestone',
  Note = 'note',
  Package = 'package',
  PassFilled = 'pass-filled',
  PlayCircle = 'play-circle',
  SettingsGear = 'settings-gear',
  SymbolField = 'symbol-field',
  Target = 'target',
  Tasklist = 'tasklist',
  Terminal = 'terminal',
  Tools = 'tools',
  Warning = 'warning',
}

export type VscodeIconString = VscodeIcon | (string & {});

export enum VscodeColor {
  ChartsGreen = 'charts.green',
  ChartsBlue = 'charts.blue',
  ChartsRed = 'charts.red',
  ChartsPurple = 'charts.purple',
  DisabledForeground = 'disabledForeground',
  ErrorForeground = 'errorForeground',
  TestingIconPassed = 'testing.iconPassed',
  EditorWarningForeground = 'editorWarning.foreground',
  EditorInfoForeground = 'editorInfo.foreground',
  EditorLineNumberForeground = 'editorLineNumber.foreground',
}

export type VscodeColorString = VscodeColor | (string & {});
