export const TOOL_NAME_PATTERN = /^[a-z0-9-]+$/;
export const TOOL_NAME_VALIDATION_MESSAGE = 'Name must contain only lowercase letters, numbers, and hyphens';

export const TASK_ITEM_PATTERN = /^(\s*)-\s*\[([ xX>!])\]\s*(.*)$/;
export const TODO_SECTION_HEADER_PATTERN = /^#\s+TASKS\s*$/;
export const MILESTONE_HEADER_PATTERN = /^##\s+(.+)$/;

export const TASK_META_BLOCK_PATTERN = /<([^>]+)>$/;
export const TASK_META_ASSIGNEE_PATTERN = /@(\w[\w-]*)/g;
export const TASK_META_PRIORITY_PATTERN = /!(urgent|high|medium|low)/i;
export const TASK_META_TAG_PATTERN = /#(\w[\w-]*)/g;
export const TASK_META_DUE_DATE_PATTERN = /due:(\d{4}-\d{2}-\d{2})/;
export const TASK_META_ESTIMATE_PATTERN = /est:(\d+[hmd])/;
export const TASK_META_EXTERNAL_ID_PATTERN = /id:([A-Za-z]+-\d+)/;

export const MARKDOWN_SECTION_HEADER_PATTERN = /^#\s+/;

export const CONFIG_TOOLS_ARRAY_PATTERN = /"tools":\s*\[/;
export const CONFIG_TASKS_ARRAY_PATTERN = /"tasks"\s*:\s*\[/;
export const CONFIG_PROMPTS_ARRAY_PATTERN = /"prompts"\s*:\s*\[/;
export const PACKAGE_JSON_SCRIPTS_PATTERN = /"scripts"\s*:\s*\{/;

export const SHELL_SCRIPT_PATTERN = /(?:bash\s+|sh\s+|\.\/)?(.+\.sh)$/;

export const DIST_DIR_PREFIX = 'dist-';

export const FILENAME_INVALID_CHARS_PATTERN = /[\/\\:*?"<>|]/g;
