import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  SECTION_NAME_BRANCH,
  SECTION_NAME_BRANCH_INFO,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
} from '../../common/constants';
import { CONFIG_FILE_NAME, ROOT_BRANCH_CONTEXT_FILE_NAME } from '../../common/constants/scripts-constants';
import {
  getBranchContextFilePath as getBranchContextFilePathUtil,
  getBranchContextGlobPattern,
  getConfigFilePathFromWorkspacePath,
} from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import type { PPConfig } from '../../common/schemas/config-schema';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { validateBranchContext } from './config-validator';
import { SectionItem } from './items';
import { generateBranchContextMarkdown } from './markdown-generator';
import { getBranchContextFilePath, getFieldLineNumber } from './markdown-parser';
import { type SyncContext, createChangedFilesProvider } from './providers';
import { SectionRegistry } from './section-registry';
import { loadBranchContext } from './state';
import { ValidationIndicator } from './validation-indicator';

const logger = createLogger('BranchContext');

function getWorkspacePath(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

export class BranchContextProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private markdownWatcher: vscode.FileSystemWatcher | null = null;
  private rootMarkdownWatcher: vscode.FileSystemWatcher | null = null;
  private currentBranch = '';
  private isWritingMarkdown = false;
  private isSyncing = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private lastSyncDirection: 'root-to-branch' | 'branch-to-root' | null = null;
  private validationIndicator: ValidationIndicator;

  constructor() {
    this.validationIndicator = new ValidationIndicator();
    this.setupMarkdownWatcher();
    this.setupRootMarkdownWatcher();
  }

  private setupMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const globPattern = getBranchContextGlobPattern();
    this.markdownWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, globPattern));

    this.markdownWatcher.onDidChange((uri) => this.handleMarkdownChange(uri));
    this.markdownWatcher.onDidCreate((uri) => this.handleMarkdownChange(uri));
  }

  private setupRootMarkdownWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    this.rootMarkdownWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME),
    );

    this.rootMarkdownWatcher.onDidChange(() => this.handleRootMarkdownChange());
    this.rootMarkdownWatcher.onDidCreate(() => this.handleRootMarkdownChange());
  }

  private handleMarkdownChange(uri?: vscode.Uri): void {
    if (this.isWritingMarkdown || this.isSyncing) {
      return;
    }

    const workspace = getWorkspacePath();
    if (!workspace || !uri) return;

    const currentBranchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (uri.fsPath !== currentBranchPath) {
      return;
    }

    this.debouncedSync(() => this.syncBranchToRoot());
  }

  private handleRootMarkdownChange(): void {
    if (this.isWritingMarkdown || this.isSyncing) {
      return;
    }

    this.debouncedSync(() => this.syncRootToBranch());
  }

  async initialize(): Promise<void> {
    logger.info('[BranchContextProvider] initialize called');

    const workspace = getWorkspacePath();
    if (!workspace) {
      logger.warn('[BranchContextProvider] No workspace found');
      return;
    }

    if (await isGitRepository(workspace)) {
      logger.info('[BranchContextProvider] Adding to git exclude');
      this.addToGitExclude(workspace);
    }

    const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON5.parse(configContent) as PPConfig;
        const issues = validateBranchContext(workspace, config.branchContext);

        if (issues.length > 0) {
          this.validationIndicator.show(issues);
        } else {
          this.validationIndicator.hide();
        }
      } catch {
        this.validationIndicator.hide();
      }
    }
  }

  private addToGitExclude(workspace: string): void {
    const excludePath = path.join(workspace, '.git', 'info', 'exclude');
    if (!fs.existsSync(excludePath)) return;

    try {
      const content = fs.readFileSync(excludePath, 'utf-8');

      if (content.includes(ROOT_BRANCH_CONTEXT_FILE_NAME)) return;

      const newContent = content.endsWith('\n')
        ? `${content}${ROOT_BRANCH_CONTEXT_FILE_NAME}\n`
        : `${content}\n${ROOT_BRANCH_CONTEXT_FILE_NAME}\n`;
      fs.writeFileSync(excludePath, newContent);
    } catch (error) {
      logger.error(`Failed to update .git/info/exclude: ${error}`);
    }
  }

  setBranch(branchName: string): void {
    logger.info(`[BranchContextProvider] setBranch called: ${branchName} (current: ${this.currentBranch})`);

    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;
      logger.info('[BranchContextProvider] Branch changed, refreshing');
      this.refresh();
    }
  }

  private debouncedSync(syncFn: () => void): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      syncFn();
      this.refresh();
      this.syncDebounceTimer = null;
    }, 200);
  }

  private syncRootToBranch(): void {
    if (!this.currentBranch) {
      return;
    }

    if (this.lastSyncDirection === 'root-to-branch') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getWorkspacePath();
    if (!workspace) return;

    const rootPath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const branchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (!fs.existsSync(rootPath)) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncDirection = 'root-to-branch';

    try {
      const content = fs.readFileSync(rootPath, 'utf-8');
      fs.writeFileSync(branchPath, content, 'utf-8');
    } catch (error) {
      logger.error(`Error syncing root to branch: ${error}`);
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
        setTimeout(() => {
          this.lastSyncDirection = null;
        }, 300);
      }, 200);
    }
  }

  private syncBranchToRoot(): void {
    if (!this.currentBranch) {
      return;
    }

    if (this.lastSyncDirection === 'branch-to-root') {
      this.lastSyncDirection = null;
      return;
    }

    const workspace = getWorkspacePath();
    if (!workspace) return;

    const rootPath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
    const branchPath = getBranchContextFilePathUtil(workspace, this.currentBranch);

    if (!fs.existsSync(branchPath)) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncDirection = 'branch-to-root';

    try {
      const content = fs.readFileSync(branchPath, 'utf-8');
      fs.writeFileSync(rootPath, content, 'utf-8');
    } catch (error) {
      logger.error(`Error syncing branch to root: ${error}`);
    } finally {
      setTimeout(() => {
        this.isSyncing = false;
        setTimeout(() => {
          this.lastSyncDirection = null;
        }, 300);
      }, 200);
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) return [];

    const workspace = getWorkspacePath();
    if (!workspace) return [];

    if (!(await isGitRepository(workspace))) {
      return [new vscode.TreeItem('Not a git repository')];
    }

    if (!this.currentBranch) {
      this.currentBranch = await getCurrentBranch(workspace);
    }

    const context = loadBranchContext(this.currentBranch);
    const config = this.loadConfig(workspace);
    const registry = new SectionRegistry(workspace, config?.branchContext);

    const items: vscode.TreeItem[] = [];
    for (const section of registry.getAllSections()) {
      const value = this.getSectionValue(context, section.name, this.currentBranch);
      items.push(new SectionItem(section, value, this.currentBranch));
    }

    return items;
  }

  private getSectionValue(
    context: Record<string, unknown>,
    sectionName: string,
    currentBranch: string,
  ): string | undefined {
    const valueMap: Record<string, string | undefined> = {
      [SECTION_NAME_BRANCH]: currentBranch,
      [SECTION_NAME_PR_LINK]: context.prLink as string | undefined,
      [SECTION_NAME_LINEAR_LINK]: context.linearLink as string | undefined,
      [SECTION_NAME_OBJECTIVE]: context.objective as string | undefined,
      [SECTION_NAME_REQUIREMENTS]: context.requirements as string | undefined,
      [SECTION_NAME_NOTES]: context.notes as string | undefined,
    };

    if (sectionName in valueMap) {
      return valueMap[sectionName];
    }

    const value = context[sectionName];
    return typeof value === 'string' ? value : undefined;
  }

  private loadConfig(workspace: string): PPConfig | null {
    const configPath = getConfigFilePathFromWorkspacePath(workspace, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON5.parse(content) as PPConfig;
    } catch {
      return null;
    }
  }

  async editField(_branchName: string, sectionName: string, _currentValue: string | undefined): Promise<void> {
    const lineKeyMap: Record<string, string> = {
      [SECTION_NAME_BRANCH]: SECTION_NAME_BRANCH_INFO,
      [SECTION_NAME_PR_LINK]: SECTION_NAME_BRANCH_INFO,
      [SECTION_NAME_LINEAR_LINK]: SECTION_NAME_BRANCH_INFO,
      [SECTION_NAME_OBJECTIVE]: SECTION_NAME_OBJECTIVE,
      [SECTION_NAME_REQUIREMENTS]: SECTION_NAME_REQUIREMENTS,
      [SECTION_NAME_NOTES]: SECTION_NAME_NOTES,
    };

    const lineKey = lineKeyMap[sectionName] ?? sectionName;
    await this.openMarkdownFileAtLine(lineKey);
  }

  async openMarkdownFile(): Promise<void> {
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath) return;

    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }

  async openMarkdownFileAtLine(fieldName: string): Promise<void> {
    const filePath = getBranchContextFilePath(this.currentBranch);
    if (!filePath) return;

    const lineNumber = getFieldLineNumber(this.currentBranch, fieldName);
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      selection: new vscode.Range(lineNumber, 0, lineNumber, 0),
    });
  }

  async syncBranchContext(): Promise<void> {
    const startTime = Date.now();
    logger.info(`[syncBranchContext] START for branch: ${this.currentBranch}`);

    if (!this.currentBranch) {
      logger.warn('[syncBranchContext] No current branch, skipping');
      return;
    }

    const workspace = getWorkspacePath();
    if (!workspace) {
      logger.warn('[syncBranchContext] No workspace, skipping');
      return;
    }

    logger.info(`[syncBranchContext] Loading context (+${Date.now() - startTime}ms)`);
    const context = loadBranchContext(this.currentBranch);
    const config = this.loadConfig(workspace);
    this.isWritingMarkdown = true;

    try {
      const syncContext: SyncContext = {
        branchName: this.currentBranch,
        workspacePath: workspace,
        markdownPath: getBranchContextFilePathUtil(workspace, this.currentBranch),
        branchContext: context,
      };

      let changedFiles: string | undefined;
      if (config?.branchContext?.changedFiles !== false) {
        logger.info(`[syncBranchContext] Fetching changedFiles (+${Date.now() - startTime}ms)`);
        const changedFilesProvider = createChangedFilesProvider(config?.branchContext?.changedFiles, workspace);
        changedFiles = await changedFilesProvider.fetch(syncContext);
        logger.info(`[syncBranchContext] changedFiles done (+${Date.now() - startTime}ms)`);
      }

      const customAutoData: Record<string, string> = {};
      if (config?.branchContext?.sections) {
        const registry = new SectionRegistry(workspace, config.branchContext);
        const autoSections = registry.getAutoSections();
        logger.info(
          `[syncBranchContext] Fetching ${autoSections.length} auto sections in PARALLEL (+${Date.now() - startTime}ms)`,
        );

        const fetchPromises = autoSections
          .filter((section) => section.provider)
          .map(async (section) => {
            logger.info(`[syncBranchContext] Starting "${section.name}" (+${Date.now() - startTime}ms)`);
            try {
              const sectionContext: SyncContext = {
                ...syncContext,
                sectionOptions: section.options,
              };
              const data = await section.provider!.fetch(sectionContext);
              logger.info(`[syncBranchContext] "${section.name}" done (+${Date.now() - startTime}ms)`);
              return { name: section.name, data };
            } catch (error) {
              logger.error(`[syncBranchContext] "${section.name}" FAILED (+${Date.now() - startTime}ms): ${error}`);
              return { name: section.name, data: `Error: ${error}` };
            }
          });

        const results = await Promise.all(fetchPromises);
        for (const { name, data } of results) {
          customAutoData[name] = data;
        }
        logger.info(`[syncBranchContext] All auto sections done (+${Date.now() - startTime}ms)`);
      }

      logger.info(`[syncBranchContext] Generating markdown (+${Date.now() - startTime}ms)`);
      await generateBranchContextMarkdown(this.currentBranch, {
        ...context,
        changedFiles,
        ...customAutoData,
      });

      logger.info(`[syncBranchContext] Syncing to root (+${Date.now() - startTime}ms)`);
      this.syncBranchToRoot();
    } finally {
      this.refresh();
      setTimeout(() => {
        this.isWritingMarkdown = false;
      }, 100);
      logger.info(`[syncBranchContext] END total time: ${Date.now() - startTime}ms`);
    }
  }

  dispose(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    this.markdownWatcher?.dispose();
    this.rootMarkdownWatcher?.dispose();
    this.validationIndicator.dispose();
  }
}
