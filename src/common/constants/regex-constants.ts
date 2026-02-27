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

export const MARKDOWN_SECTION_HEADER_PATTERN = /^#\s+/m;
export const MARKDOWN_H1_HEADER_PATTERN = /^#(?!#)\s+/m;
export const MARKDOWN_SECTION_NAME_PATTERN = /^#\s+([A-Z][A-Z\s]+)\s*$/gm;
export const MARKDOWN_FIELD_PATTERN = /^([A-Z][A-Z\s]+):\s*(.*)$/gm;

export const AI_SPEC_DEV_TOOLS_PATTERN = /<dev_tools>[\s\S]*?<\/dev_tools>/;
export const AI_SPEC_AVAILABLE_TOOLS_PATTERN = /<available_tools>[\s\S]*?<\/available_tools>/;

export const CHANGED_FILE_LINE_PATTERN = /^([AMD?R])\s+(.+?)\s+\(([+-][\d-]+)\s([+-][\d-]+)\)$/;

export const createChangedFilesSectionRegex = (sectionName: string, metadataSection: string) =>
  new RegExp(`# ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n#[^#]|\\n<!-- ${metadataSection}|$)`);

export const DATE_YYYY_MM_DD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CONFIG_TASKS_ARRAY_PATTERN = /"tasks"\s*:\s*\[/;
export const PACKAGE_JSON_SCRIPTS_PATTERN = /"scripts"\s*:\s*\{/;

export const SHELL_SCRIPT_PATTERN =
  /(?:bash\s+|sh\s+|cmd\s+\/c\s+|powershell\s+(?:-[Ff]ile\s+)?|\.\/)?(.+\.(?:sh|bat|cmd|ps1))$/;

export const DIST_DIR_PREFIX = 'dist-';

export const FILENAME_INVALID_CHARS_PATTERN = /[\/\\:*?"<>|]/g;

export const CODEBLOCK_CONTENT_PATTERN = /^```\s*\n([\s\S]*?)\n```/m;

export const createSectionHeaderPattern = (sectionName: string) => new RegExp(`^#\\s+${sectionName}\\s*$`, 'im');

export const createFieldValuePattern = (fieldName: string) => new RegExp(`^${fieldName}:\\s*(.*)$`, 'im');

export const createFieldStartPattern = (fieldName: string) => new RegExp(`^${fieldName}:`, 'i');

export const createTemplatePlaceholderPattern = (placeholder: string) => new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');

export const createVariablePlaceholderPattern = (variable: string) => new RegExp(`\\$${variable}`, 'g');

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const createMetadataPattern = (prefix: string, suffix: string) =>
  new RegExp(`${escapeRegex(prefix)}(.+?)${escapeRegex(suffix)}`);
