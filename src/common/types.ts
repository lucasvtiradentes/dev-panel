interface TaskIcon {
  id: string;
  color?: string;
}

export interface TaskDefinition {
  label: string;
  hide?: boolean;
  icon?: TaskIcon;
  group?: string;
  type?: string;
  command?: string;
  detail?: string;
}

export interface TasksJson {
  version?: string;
  tasks: TaskDefinition[];
}

export interface CodeWorkspaceFile {
  folders?: { path: string }[];
  tasks?: TasksJson;
}
