export enum LocationScope {
  Global = 'global',
  Workspace = 'workspace',
}

export enum Position {
  Before = 'before',
  After = 'after',
}

export enum ConfigKey {
  Plugins = 'plugins',
  Prompts = 'prompts',
  Tools = 'tools',
  Scripts = 'scripts',
  Tasks = 'tasks',
}

export enum GitFileStatus {
  Added = 'A',
  Modified = 'M',
  Deleted = 'D',
  Renamed = 'R',
  Copied = 'C',
}

export enum DocSection {
  Description = 'description',
  Examples = 'examples',
  WhenToUse = 'when to use it?',
  Rules = 'rules',
  Notes = 'notes',
  Troubleshooting = 'troubleshooting',
}

export enum ToggleLabel {
  On = 'ON',
  Off = 'OFF',
}

export enum VscodeTaskSource {
  Workspace = 'Workspace',
}
