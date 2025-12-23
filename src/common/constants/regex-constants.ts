export const TOOL_NAME_PATTERN = /^[a-z0-9-]+$/;
export const TOOL_NAME_VALIDATION_MESSAGE = 'Name must contain only lowercase letters, numbers, and hyphens';

export const TODO_MILESTONE_PATTERN = /^##\s+(.+)$/;
export const TODO_ITEM_PATTERN = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
export const TODO_SECTION_HEADER_PATTERN = /^#\s+TASKS\s*$/;

export const MARKDOWN_SECTION_HEADER_PATTERN = /^#\s+/;

export const CONFIG_TOOLS_ARRAY_PATTERN = /"tools":\s*\[/;
export const CONFIG_TASKS_ARRAY_PATTERN = /"tasks"\s*:\s*\[/;
export const CONFIG_PROMPTS_ARRAY_PATTERN = /"prompts"\s*:\s*\[/;
export const PACKAGE_JSON_SCRIPTS_PATTERN = /"scripts"\s*:\s*\{/;

export const SHELL_SCRIPT_PATTERN = /(?:bash\s+|sh\s+|\.\/)?(.+\.sh)$/;

export const DIST_DIR_PREFIX = 'dist-';
