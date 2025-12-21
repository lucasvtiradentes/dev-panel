import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import { Command, registerCommand } from '../../common';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME } from '../../common/constants';
import type { PPConfig } from '../../common/schemas/types';

interface ToolInstruction {
  id: string;
  name: string;
  description?: string;
  cmd?: string;
  example?: string;
  when?: string;
  rules?: string;
  notes?: string;
  troubleshooting?: string;
}

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

function generateToolsXml(workspaceFolder: vscode.WorkspaceFolder): string {
  const configPath = path.join(workspaceFolder.uri.fsPath, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) {
    return '<project_tools>\n  <!-- No tools configured -->\n</project_tools>';
  }

  const config = JSON5.parse(fs.readFileSync(configPath, 'utf8')) as PPConfig;
  const tools = config.tools ?? [];

  if (tools.length === 0) {
    return '<project_tools>\n  <!-- No tools configured -->\n</project_tools>';
  }

  const toolsXml: string[] = ['<project_tools>'];

  for (const tool of tools) {
    const instructionsPath = path.join(
      workspaceFolder.uri.fsPath,
      CONFIG_DIR_NAME,
      'tools',
      tool.name,
      'instructions.md',
    );

    let instruction: ToolInstruction;
    if (fs.existsSync(instructionsPath)) {
      const content = fs.readFileSync(instructionsPath, 'utf8');
      instruction = parseInstructionsMd(content, tool.name);
    } else {
      instruction = {
        id: tool.name,
        name: tool.name,
        cmd: tool.command,
      };
    }

    if (!instruction.cmd) {
      instruction.cmd = tool.command;
    }

    toolsXml.push(`  <tool id="${instruction.id}">`);
    toolsXml.push(`    <name>${instruction.name}</name>`);

    if (instruction.description) {
      toolsXml.push(`    <description>${instruction.description}</description>`);
    }

    toolsXml.push(`    <cmd>${instruction.cmd}</cmd>`);

    if (instruction.example) {
      toolsXml.push('    <example>');
      const exampleLines = instruction.example.split('\n');
      for (const line of exampleLines) {
        toolsXml.push(`      ${line}`);
      }
      toolsXml.push('    </example>');
    }

    if (instruction.when) {
      toolsXml.push('    <when>');
      const whenLines = instruction.when.split('\n');
      for (const line of whenLines) {
        toolsXml.push(`      - ${line}`);
      }
      toolsXml.push('    </when>');
    }

    if (instruction.rules) {
      toolsXml.push('    <rules>');
      const rulesLines = instruction.rules.split('\n');
      for (const line of rulesLines) {
        toolsXml.push(`      - ${line}`);
      }
      toolsXml.push('    </rules>');
    }

    if (instruction.notes) {
      toolsXml.push('    <notes>');
      const notesLines = instruction.notes.split('\n');
      for (const line of notesLines) {
        toolsXml.push(`      - ${line}`);
      }
      toolsXml.push('    </notes>');
    }

    if (instruction.troubleshooting) {
      toolsXml.push('    <troubleshooting>');
      const troubleshootingLines = instruction.troubleshooting.split('\n');
      for (const line of troubleshootingLines) {
        toolsXml.push(`      - ${line}`);
      }
      toolsXml.push('    </troubleshooting>');
    }

    toolsXml.push('  </tool>');
    toolsXml.push('');
  }

  toolsXml.push('</project_tools>');
  return toolsXml.join('\n');
}

async function syncToAiSpecs(xml: string, workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const specFiles = ['CLAUDE.md', 'AGENTS.md'];
  const foundFiles: string[] = [];

  for (const specFile of specFiles) {
    const specPath = path.join(workspaceFolder.uri.fsPath, specFile);
    if (fs.existsSync(specPath)) {
      foundFiles.push(specPath);
    }
  }

  if (foundFiles.length === 0) {
    vscode.window.showWarningMessage(`No AI specification files found (${specFiles.join(', ')})`);
    return;
  }

  for (const filePath of foundFiles) {
    let content = fs.readFileSync(filePath, 'utf8');

    const projectToolsRegex = /<project_tools>[\s\S]*?<\/project_tools>/;
    if (projectToolsRegex.test(content)) {
      content = content.replace(projectToolsRegex, xml);
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
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  const xml = generateToolsXml(workspaceFolder);

  const choice = await vscode.window.showQuickPick(
    [
      { label: 'Copy to clipboard', value: 'copy' },
      { label: 'Sync to AI specifications', value: 'sync' },
    ],
    { placeHolder: 'What would you like to do with the tools documentation?' },
  );

  if (!choice) return;

  if (choice.value === 'copy') {
    await vscode.env.clipboard.writeText(xml);
    vscode.window.showInformationMessage('Tools documentation copied to clipboard');
  } else if (choice.value === 'sync') {
    await syncToAiSpecs(xml, workspaceFolder);
  }
}

export function createGenerateToolsDocsCommand(): vscode.Disposable {
  return registerCommand(Command.GenerateToolsDocs, handleGenerateToolsDocs);
}
