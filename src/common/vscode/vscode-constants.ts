export const VscodeConstants = {
  get TreeItemCollapsibleState() {
    return require('vscode').TreeItemCollapsibleState;
  },
};

export enum VscodeIcon {
  EyeClosed = 'eye-closed',
  HeartFilled = 'heart-filled',
  CircleFilled = 'circle-filled',
  Inbox = 'inbox',
  Milestone = 'milestone',
  PassFilled = 'pass-filled',
  PlayCircle = 'play-circle',
  Error = 'error',
  CircleLargeOutline = 'circle-large-outline',
  GitBranch = 'git-branch',
  GitPullRequest = 'git-pull-request',
  Link = 'link',
  Target = 'target',
  Checklist = 'checklist',
  Note = 'note',
  Tasklist = 'tasklist',
  Diff = 'diff',
  SymbolField = 'symbol-field',
  Tools = 'tools',
  Package = 'package',
  Beaker = 'beaker',
  Extensions = 'extensions',
  CommentDiscussion = 'comment-discussion',
  Terminal = 'terminal',
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
