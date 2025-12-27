import {
  AI_SPEC_AVAILABLE_TOOLS_REGEX,
  AI_SPEC_DEV_TOOLS_REGEX,
  AI_SPEC_FILES,
  CLAUDE_DIR_NAME,
  GLOBAL_ITEM_PREFIX,
  SKILLS_DIR_NAME,
  SKILL_FILE_NAME,
  getGlobalToolInstructionsPath,
  getSkillDir,
  getSkillFilePath,
} from '../../../common/constants';
import { ConfigManager } from '../../../common/lib/config-manager';
import { FileIOHelper } from '../../../common/lib/node-helper';
import { NodePathHelper } from '../../../common/lib/node-helper';
import type { DevPanelConfig } from '../../../common/schemas';
import { toolsState } from '../../../common/state';
import { requireWorkspaceFolder } from '../../../common/utils/workspace-utils';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable, WorkspaceFolder } from '../../../common/vscode/vscode-types';
import { Command, registerCommand } from '../../../common/vscode/vscode-utils';

type ToolInstruction = {
  id: string;
  name: string;
  description?: string;
  cmd?: string;
  example?: string;
  when?: string;
  rules?: string;
  notes?: string;
  troubleshooting?: string;
};

function parseInstructionsMd(content: string, toolName: string): ToolInstruction {
  const lines = content.split('\n');
  const instruction: ToolInstruction = {
    id: toolName,
    name: toolName,
  };

  let currentSection = '';
  let exampleBuffer: string[] = [];
  const descriptionBuffer: string[] = [];
  const whenBuffer: string[] = [];
  const rulesBuffer: string[] = [];
  const notesBuffer: string[] = [];
  const troubleshootingBuffer: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      currentSection = line.slice(2).toLowerCase().trim();
      continue;
    }

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        if (currentSection === 'examples' && exampleBuffer.length > 0) {
          if (!instruction.example) {
            instruction.example = exampleBuffer.join('\n');
          }
        }
        exampleBuffer = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      if (currentSection === 'examples') {
        exampleBuffer.push(line);
      }
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (currentSection === 'description') {
      descriptionBuffer.push(trimmed);
    }

    if (currentSection === 'when to use it?') {
      if (trimmed.startsWith('-')) {
        const text = trimmed.slice(1).trim();
        whenBuffer.push(text);
      }
    }

    if (currentSection === 'rules') {
      if (trimmed.startsWith('-')) {
        const text = trimmed.slice(1).trim();
        rulesBuffer.push(text);
      }
    }

    if (currentSection === 'notes') {
      if (trimmed.startsWith('-')) {
        const text = trimmed.slice(1).trim();
        notesBuffer.push(text);
      }
    }

    if (currentSection === 'troubleshooting') {
      if (trimmed.startsWith('-')) {
        const text = trimmed.slice(1).trim();
        troubleshootingBuffer.push(text);
      }
    }
  }

  if (descriptionBuffer.length > 0) {
    instruction.description = descriptionBuffer.join(' ');
  }

  if (whenBuffer.length > 0) {
    instruction.when = whenBuffer.join('\n');
  }

  if (rulesBuffer.length > 0) {
    instruction.rules = rulesBuffer.join('\n');
  }

  if (notesBuffer.length > 0) {
    instruction.notes = notesBuffer.join('\n');
  }

  if (troubleshootingBuffer.length > 0) {
    instruction.troubleshooting = troubleshootingBuffer.join('\n');
  }

  return instruction;
}

function getGlobalTools(): NonNullable<DevPanelConfig['tools']> {
  const config = ConfigManager.loadGlobalConfig();
  return config?.tools ?? [];
}

function generateToolsXml(workspaceFolder: WorkspaceFolder): string {
  const config = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  const localTools = config?.tools ?? [];

  const globalTools = getGlobalTools();
  const activeTools = toolsState.getActiveTools();

  const activeLocalTools = localTools.filter((tool) => activeTools.includes(tool.name));
  const activeGlobalTools = globalTools.filter((tool) => activeTools.includes(`${GLOBAL_ITEM_PREFIX}${tool.name}`));
  const allActiveTools = [...activeLocalTools, ...activeGlobalTools];

  if (allActiveTools.length === 0) {
    return '<available_tools>\n  No custom CLI tools configured.\n</available_tools>';
  }

  const toolsXml: string[] = ['<available_tools>'];
  toolsXml.push('  Custom CLI tools installed (execute via Bash tool):');

  for (const tool of activeLocalTools) {
    const instructionsPath = ConfigManager.getWorkspaceToolInstructionsPath(workspaceFolder, tool.name);

    let description = '';
    if (FileIOHelper.fileExists(instructionsPath)) {
      const content = FileIOHelper.readFile(instructionsPath);
      const instruction = parseInstructionsMd(content, tool.name);
      description = instruction.description ?? '';
    }

    toolsXml.push(`  - ${tool.name}: ${description}`);
  }

  for (const tool of activeGlobalTools) {
    const instructionsPath = getGlobalToolInstructionsPath(tool.name);

    let description = '';
    if (FileIOHelper.fileExists(instructionsPath)) {
      const content = FileIOHelper.readFile(instructionsPath);
      const instruction = parseInstructionsMd(content, tool.name);
      description = instruction.description ?? '';
    }

    toolsXml.push(`  - ${tool.name}: ${description} (global)`);
  }

  toolsXml.push('');
  toolsXml.push('  CRITICAL: When ANY of these tools are mentioned or needed, you MUST:');
  toolsXml.push('  1. FIRST use Skill tool to read the documentation (e.g., Skill with skill: "chrome-cmd")');
  toolsXml.push('  2. ONLY THEN execute commands via Bash tool');
  toolsXml.push('  ');
  toolsXml.push(`  Skills location: ${CLAUDE_DIR_NAME}/${SKILLS_DIR_NAME}/{tool-name}/${SKILL_FILE_NAME}`);
  toolsXml.push('</available_tools>');

  return toolsXml.join('\n');
}

function generateSkillMd(instructionsContent: string, toolName: string, toolCommand: string): string {
  const lines = instructionsContent.split('\n');
  const contentLines: string[] = [];
  let skipNextSection = false;
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      contentLines.push(line);
      continue;
    }

    if (!inCodeBlock && line.startsWith('# ')) {
      const section = line.slice(2).toLowerCase().trim();
      if (section === 'description') {
        skipNextSection = true;
        continue;
      }
      skipNextSection = false;
    }

    if (!skipNextSection) {
      contentLines.push(line);
    }
  }

  const descriptionMatch = instructionsContent.match(/# Description\n\n(.+?)(?=\n\n#|$)/s);
  const description = descriptionMatch?.[1]?.trim() ?? `${toolName} CLI tool`;

  const skillContent = `---
name: ${toolName}
description: ${description}
allowed-tools: Bash(${toolName}:*)
---

# ${toolName.charAt(0).toUpperCase() + toolName.slice(1)} CLI

${description}

## How to execute

IMPORTANT: Use Bash tool to run ${toolName} commands directly. DO NOT use Skill tool.

Example:
\`\`\`bash
${toolCommand}
\`\`\`

${contentLines.join('\n').trim()}
`;

  return skillContent;
}

async function syncToSkills(workspaceFolder: WorkspaceFolder): Promise<number> {
  const config = ConfigManager.loadWorkspaceConfig(workspaceFolder);
  const localTools = config?.tools ?? [];

  const globalTools = getGlobalTools();
  const activeTools = toolsState.getActiveTools();

  const activeLocalTools = localTools.filter((tool) => activeTools.includes(tool.name));
  const activeGlobalTools = globalTools.filter((tool) => activeTools.includes(`${GLOBAL_ITEM_PREFIX}${tool.name}`));

  const inactiveLocalTools = localTools.filter((tool) => !activeTools.includes(tool.name));
  const inactiveGlobalTools = globalTools.filter((tool) => !activeTools.includes(`${GLOBAL_ITEM_PREFIX}${tool.name}`));

  for (const tool of inactiveLocalTools) {
    const skillDir = getSkillDir(workspaceFolder.uri.fsPath, tool.name);
    FileIOHelper.deleteDirectory(skillDir);
  }

  for (const tool of inactiveGlobalTools) {
    const skillDir = getSkillDir(workspaceFolder.uri.fsPath, tool.name);
    FileIOHelper.deleteDirectory(skillDir);
  }

  let syncedCount = 0;

  for (const tool of activeLocalTools) {
    const instructionsPath = ConfigManager.getWorkspaceToolInstructionsPath(workspaceFolder, tool.name);

    if (!FileIOHelper.fileExists(instructionsPath)) {
      continue;
    }

    const instructionsContent = FileIOHelper.readFile(instructionsPath);
    const exampleCommand = instructionsContent.match(/```bash\n(.+?)\n/)?.[1] ?? tool.command ?? tool.name;
    const skillContent = generateSkillMd(instructionsContent, tool.name, exampleCommand);

    const skillDir = getSkillDir(workspaceFolder.uri.fsPath, tool.name);
    FileIOHelper.ensureDirectoryExists(skillDir);

    const skillPath = getSkillFilePath(workspaceFolder.uri.fsPath, tool.name);
    FileIOHelper.writeFile(skillPath, skillContent);
    syncedCount++;
  }

  for (const tool of activeGlobalTools) {
    const instructionsPath = getGlobalToolInstructionsPath(tool.name);

    if (!FileIOHelper.fileExists(instructionsPath)) {
      continue;
    }

    const instructionsContent = FileIOHelper.readFile(instructionsPath);
    const exampleCommand = instructionsContent.match(/```bash\n(.+?)\n/)?.[1] ?? tool.command ?? tool.name;
    const skillContent = generateSkillMd(instructionsContent, tool.name, exampleCommand);

    const skillDir = getSkillDir(workspaceFolder.uri.fsPath, tool.name);
    FileIOHelper.ensureDirectoryExists(skillDir);

    const skillPath = getSkillFilePath(workspaceFolder.uri.fsPath, tool.name);
    FileIOHelper.writeFile(skillPath, skillContent);
    syncedCount++;
  }

  return syncedCount;
}

function syncToAiSpecs(xml: string, workspaceFolder: WorkspaceFolder) {
  const foundFiles: string[] = [];

  for (const specFile of AI_SPEC_FILES) {
    const specPath = NodePathHelper.join(workspaceFolder.uri.fsPath, specFile);
    if (FileIOHelper.fileExists(specPath)) {
      foundFiles.push(specPath);
    }
  }

  if (foundFiles.length === 0) {
    VscodeHelper.showToastMessage(ToastKind.Warning, `No AI specification files found (${AI_SPEC_FILES.join(', ')})`);
    return;
  }

  for (const filePath of foundFiles) {
    let content = FileIOHelper.readFile(filePath);

    if (AI_SPEC_DEV_TOOLS_REGEX.test(content)) {
      content = content.replace(AI_SPEC_DEV_TOOLS_REGEX, xml);
    } else if (AI_SPEC_AVAILABLE_TOOLS_REGEX.test(content)) {
      content = content.replace(AI_SPEC_AVAILABLE_TOOLS_REGEX, xml);
    } else {
      content = `${content.trimEnd()}\n\n${xml}\n`;
    }

    FileIOHelper.writeFile(filePath, content);
  }

  VscodeHelper.showToastMessage(
    ToastKind.Info,
    `Updated ${foundFiles.length} file(s) with tools documentation: ${foundFiles.map((f) => NodePathHelper.basename(f)).join(', ')}`,
  );
}

async function handleGenerateToolsDocs() {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const skillsCount = await syncToSkills(workspaceFolder);
  const xml = generateToolsXml(workspaceFolder);
  syncToAiSpecs(xml, workspaceFolder);

  if (skillsCount > 0) {
    VscodeHelper.showToastMessage(
      ToastKind.Info,
      `Synced ${skillsCount} tool(s) to ${CLAUDE_DIR_NAME}/${SKILLS_DIR_NAME}/`,
    );
  }
}

export function createGenerateToolsDocsCommand(): Disposable {
  return registerCommand(Command.GenerateToolsDocs, handleGenerateToolsDocs);
}
