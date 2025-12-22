export const TOOL_NAME_PATTERN = /^[a-z0-9-]+$/;
export const TOOL_NAME_VALIDATION_MESSAGE = 'Name must contain only lowercase letters, numbers, and hyphens';

export const TODO_MILESTONE_PATTERN = /^##\s+(.+)$/;
export const TODO_ITEM_PATTERN = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
export const TODO_SECTION_HEADER_PATTERN = /^#\s+TODO\s*$/;

export const MARKDOWN_SECTION_HEADER_PATTERN = /^#\s+/;

export const CONFIG_TOOLS_ARRAY_PATTERN = /"tools":\s*\[/;

export const SHELL_SCRIPT_PATTERN = /(?:bash\s+|sh\s+|\.\/)?(.+\.sh)$/;

export const DIST_DIR_PREFIX = 'dist-';
