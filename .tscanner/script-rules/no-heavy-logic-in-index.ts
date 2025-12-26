#!/usr/bin/env npx tsx

import { type ScriptIssue, addIssue, runScript } from 'tscanner';

const ALLOWED_PATTERNS = [
  /^\s*$/,
  /^\s*\/\//,
  /^\s*\/\*/,
  /^\s*\*/,
  /^\s*\*\//,
  /^\s*import\s/,
  /^\s*import\s*{/,
  /^\s*import\s*\*/,
  /^\s*import\s*type/,
  /^\s*export\s*\*/,
  /^\s*export\s*{/,
  /^\s*export\s*type/,
  /^\s*export\s+default\s/,
  /^\s*}\s*from\s/,
  /^\s*}\s*;?\s*$/,
  /^\s*type\s+\w+/,
  /^\s*\w+,?\s*$/,
  /^\s*\[[\w.]+\]:/,
];

function isAllowedLine(line: string): boolean {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(line));
}

function isIndexFile(filePath: string): boolean {
  return /[/\\]index\.(ts|tsx|js|jsx)$/.test(filePath);
}

runScript((input) => {
  const issues: ScriptIssue[] = [];

  for (const file of input.files) {
    if (!isIndexFile(file.path)) continue;

    let inMultilineComment = false;
    let firstViolation: { line: number; content: string } | null = null;

    for (let i = 0; i < file.lines.length; i++) {
      const line = file.lines[i];
      const lineNum = i + 1;

      if (line.includes('/*')) inMultilineComment = true;
      if (line.includes('*/')) {
        inMultilineComment = false;
        continue;
      }
      if (inMultilineComment) continue;

      if (!isAllowedLine(line)) {
        firstViolation = { line: lineNum, content: line.trim().slice(0, 50) };
        break;
      }
    }

    if (firstViolation) {
      addIssue(issues, {
        file: file.path,
        line: firstViolation.line,
        message: `Index files should only contain imports/exports. Found: ${firstViolation.content}`,
      });
    }
  }

  return issues;
});
