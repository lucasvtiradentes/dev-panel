import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  AI_SPEC_AVAILABLE_TOOLS_REGEX,
  AI_SPEC_FILES,
  AI_SPEC_PROJECT_TOOLS_REGEX,
  CLAUDE_DIR_NAME,
  GLOBAL_ITEM_PREFIX,
  SKILLS_DIR_NAME,
  SKILL_FILE_NAME,
  TOOLS_DIR,
  TOOL_INSTRUCTIONS_FILE,
  getGlobalToolsDir,
} from '../../common/constants';
import { getWorkspaceConfigDirPath, loadGlobalConfig, loadWorkspaceConfig } from '../../common/lib/config-manager';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { toolsState } from '../../common/lib/workspace-state';
import type { PPConfig } from '../../common/schemas';
import { requireWorkspaceFolder } from '../../common/utils/workspace-utils';

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

function getGlobalTools(): NonNullable<PPConfig['tools']> {
  const config = loadGlobalConfig();
  return config?.tools ?? [];
}

function generateToolsXml(workspaceFolder: vscode.WorkspaceFolder): string {
  const config = loadWorkspaceConfig(workspaceFolder);
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

  const workspaceConfigDir = getWorkspaceConfigDirPath(workspaceFolder);
  for (const tool of activeLocalTools) {
    const instructionsPath = path.join(workspaceConfigDir, TOOLS_DIR, tool.name, TOOL_INSTRUCTIONS_FILE);

    let description = '';
    if (fs.existsSync(instructionsPath)) {
      const content = fs.readFileSync(instructionsPath, 'utf8');
      const instruction = parseInstructionsMd(content, tool.name);
      description = instruction.description ?? '';
    }

    toolsXml.push(`  - ${tool.name}: ${description}`);
  }

  for (const tool of activeGlobalTools) {
    const instructionsPath = path.join(getGlobalToolsDir(), tool.name, TOOL_INSTRUCTIONS_FILE);

    let description = '';
    if (fs.existsSync(instructionsPath)) {
      const content = fs.readFileSync(instructionsPath, 'utf8');
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

async function syncToSkills(workspaceFolder: vscode.WorkspaceFolder): Promise<number> {
  const config = loadWorkspaceConfig(workspaceFolder);
  const localTools = config?.tools ?? [];

  const globalTools = getGlobalTools();
  const activeTools = toolsState.getActiveTools();

  const activeLocalTools = localTools.filter((tool) => activeTools.includes(tool.name));
  const activeGlobalTools = globalTools.filter((tool) => activeTools.includes(`${GLOBAL_ITEM_PREFIX}${tool.name}`));

  const inactiveLocalTools = localTools.filter((tool) => !activeTools.includes(tool.name));
  const inactiveGlobalTools = globalTools.filter((tool) => !activeTools.includes(`${GLOBAL_ITEM_PREFIX}${tool.name}`));

  for (const tool of inactiveLocalTools) {
    const skillDir = path.join(workspaceFolder.uri.fsPath, CLAUDE_DIR_NAME, SKILLS_DIR_NAME, tool.name);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true });
    }
  }

  for (const tool of inactiveGlobalTools) {
    const skillDir = path.join(workspaceFolder.uri.fsPath, CLAUDE_DIR_NAME, SKILLS_DIR_NAME, tool.name);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true });
    }
  }

  let syncedCount = 0;

  const workspaceConfigDir = getWorkspaceConfigDirPath(workspaceFolder);
  for (const tool of activeLocalTools) {
    const instructionsPath = path.join(workspaceConfigDir, TOOLS_DIR, tool.name, TOOL_INSTRUCTIONS_FILE);

    if (!fs.existsSync(instructionsPath)) {
      continue;
    }

    const instructionsContent = fs.readFileSync(instructionsPath, 'utf8');
    const exampleCommand = instructionsContent.match(/```bash\n(.+?)\n/)?.[1] ?? tool.command ?? tool.name;
    const skillContent = generateSkillMd(instructionsContent, tool.name, exampleCommand);

    const skillDir = path.join(workspaceFolder.uri.fsPath, CLAUDE_DIR_NAME, SKILLS_DIR_NAME, tool.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const skillPath = path.join(skillDir, SKILL_FILE_NAME);
    fs.writeFileSync(skillPath, skillContent, 'utf8');
    syncedCount++;
  }

  for (const tool of activeGlobalTools) {
    const instructionsPath = path.join(getGlobalToolsDir(), tool.name, TOOL_INSTRUCTIONS_FILE);

    if (!fs.existsSync(instructionsPath)) {
      continue;
    }

    const instructionsContent = fs.readFileSync(instructionsPath, 'utf8');
    const exampleCommand = instructionsContent.match(/```bash\n(.+?)\n/)?.[1] ?? tool.command ?? tool.name;
    const skillContent = generateSkillMd(instructionsContent, tool.name, exampleCommand);

    const skillDir = path.join(workspaceFolder.uri.fsPath, CLAUDE_DIR_NAME, SKILLS_DIR_NAME, tool.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const skillPath = path.join(skillDir, SKILL_FILE_NAME);
    fs.writeFileSync(skillPath, skillContent, 'utf8');
    syncedCount++;
  }

  return syncedCount;
}

function syncToAiSpecs(xml: string, workspaceFolder: vscode.WorkspaceFolder): void {
  const foundFiles: string[] = [];

  for (const specFile of AI_SPEC_FILES) {
    const specPath = path.join(workspaceFolder.uri.fsPath, specFile);
    if (fs.existsSync(specPath)) {
      foundFiles.push(specPath);
    }
  }

  if (foundFiles.length === 0) {
    vscode.window.showWarningMessage(`No AI specification files found (${AI_SPEC_FILES.join(', ')})`);
    return;
  }

  for (const filePath of foundFiles) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (AI_SPEC_PROJECT_TOOLS_REGEX.test(content)) {
      content = content.replace(AI_SPEC_PROJECT_TOOLS_REGEX, xml);
    } else if (AI_SPEC_AVAILABLE_TOOLS_REGEX.test(content)) {
      content = content.replace(AI_SPEC_AVAILABLE_TOOLS_REGEX, xml);
    } else {
      content = `${content.trimEnd()}\n\n${xml}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  vscode.window.showInformationMessage(
    `Updated ${foundFiles.length} file(s) with tools documentation: ${foundFiles.map((f) => path.basename(f)).join(', ')}`,
  );
}

async function handleGenerateToolsDocs(): Promise<void> {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const skillsCount = await syncToSkills(workspaceFolder);
  const xml = generateToolsXml(workspaceFolder);
  syncToAiSpecs(xml, workspaceFolder);

  if (skillsCount > 0) {
    vscode.window.showInformationMessage(`Synced ${skillsCount} tool(s) to ${CLAUDE_DIR_NAME}/${SKILLS_DIR_NAME}/`);
  }
}

export function createGenerateToolsDocsCommand(): vscode.Disposable {
  return registerCommand(Command.GenerateToolsDocs, handleGenerateToolsDocs);
}
