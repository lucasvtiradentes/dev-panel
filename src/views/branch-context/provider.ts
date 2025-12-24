import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import * as vscode from 'vscode';
import {
  ChangedFilesStyle,
  GIT_LOG_LAST_COMMIT_MESSAGE,
  GIT_REV_PARSE_HEAD,
  METADATA_FIELD_IS_EMPTY,
  NOT_GIT_REPO_MESSAGE,
  SECTION_NAME_BRANCH,
  SECTION_NAME_BRANCH_INFO,
  SECTION_NAME_CHANGED_FILES,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
} from '../../common/constants';
import {
  BRANCH_CONTEXT_NA,
  BRANCH_CONTEXT_NO_CHANGES,
  CONFIG_FILE_NAME,
  ROOT_BRANCH_CONTEXT_FILE_NAME,
} from '../../common/constants/scripts-constants';
import {
  getBranchContextFilePath as getBranchContextFilePathUtil,
  getBranchContextGlobPattern,
  getBranchContextTemplatePath,
  getConfigFilePathFromWorkspacePath,
} from '../../common/lib/config-manager';
import { createLogger } from '../../common/lib/logger';
import { ContextKey, setContextKey } from '../../common/lib/vscode-utils';
import { branchContextState } from '../../common/lib/workspace-state';
import type { PPConfig } from '../../common/schemas/config-schema';
import { getCurrentBranch, isGitRepository } from '../replacements/git-utils';
import { validateBranchContext } from './config-validator';
import { formatChangedFilesSummary, getChangedFilesWithSummary } from './git-changed-files';
import { SectionItem } from './items';
import { generateBranchContextMarkdown } from './markdown-generator';
import { getBranchContextFilePath, getFieldLineNumber } from './markdown-parser';
import type { SyncContext } from './providers';
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
  private templateWatcher: vscode.FileSystemWatcher | null = null;
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
    this.setupTemplateWatcher();
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

  private setupTemplateWatcher(): void {
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const templatePath = getBranchContextTemplatePath(workspace);
    this.templateWatcher = vscode.workspace.createFileSystemWatcher(templatePath);

    this.templateWatcher.onDidChange(() => this.handleTemplateChange());
    this.templateWatcher.onDidCreate(() => this.handleTemplateChange());
  }

  private handleTemplateChange(): void {
    if (!this.currentBranch) return;
    logger.info('[BranchContextProvider] Template changed, syncing branch context');
    void this.syncBranchContext();
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

  setBranch(branchName: string, shouldRefresh = true): void {
    logger.info(`[BranchContextProvider] setBranch called: ${branchName} (current: ${this.currentBranch})`);

    if (branchName !== this.currentBranch) {
      this.currentBranch = branchName;
      if (shouldRefresh) {
        logger.info('[BranchContextProvider] Branch changed, refreshing');
        this.refresh();
      }
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
    void setContextKey(ContextKey.BranchContextHideEmptySections, branchContextState.getHideEmptySections());
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
      return [new vscode.TreeItem(NOT_GIT_REPO_MESSAGE)];
    }

    if (!this.currentBranch) {
      this.currentBranch = await getCurrentBranch(workspace);
    }

    const context = loadBranchContext(this.currentBranch);
    const config = this.loadConfig(workspace);
    const hideEmpty = branchContextState.getHideEmptySections();
    const showChangedFiles = config?.branchContext?.builtinSections?.changedFiles !== false;

    const registry = new SectionRegistry(workspace, config?.branchContext, showChangedFiles);

    const changedFilesSectionMetadata = context.metadata?.sections?.[SECTION_NAME_CHANGED_FILES];
    let changedFilesValue = BRANCH_CONTEXT_NO_CHANGES;
    if (changedFilesSectionMetadata) {
      const summary = {
        added: (changedFilesSectionMetadata.added as number) || 0,
        modified: (changedFilesSectionMetadata.modified as number) || 0,
        deleted: (changedFilesSectionMetadata.deleted as number) || 0,
      };
      changedFilesValue = formatChangedFilesSummary(summary);
    }

    const items: vscode.TreeItem[] = [];
    for (const section of registry.getAllSections()) {
      const value = this.getSectionValue(context, section.name, this.currentBranch, changedFilesValue);
      const sectionMetadata = context.metadata?.sections?.[section.name];

      if (hideEmpty && this.isSectionEmpty(value, section.type, sectionMetadata)) {
        continue;
      }

      items.push(new SectionItem(section, value, this.currentBranch, sectionMetadata));
    }

    return items;
  }

  private isSectionEmpty(value: string | undefined, sectionType: string, metadata?: Record<string, unknown>): boolean {
    if (sectionType === 'auto' && metadata) {
      return metadata[METADATA_FIELD_IS_EMPTY] === true;
    }

    if (!value) return true;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === BRANCH_CONTEXT_NA) return true;
    return false;
  }

  private getSectionValue(
    context: Record<string, unknown>,
    sectionName: string,
    currentBranch: string,
    changedFilesValue?: string,
  ): string | undefined {
    const valueMap: Record<string, string | undefined> = {
      [SECTION_NAME_BRANCH]: currentBranch,
      [SECTION_NAME_PR_LINK]: context.prLink as string | undefined,
      [SECTION_NAME_LINEAR_LINK]: context.linearLink as string | undefined,
      [SECTION_NAME_OBJECTIVE]: context.objective as string | undefined,
      [SECTION_NAME_REQUIREMENTS]: context.requirements as string | undefined,
      [SECTION_NAME_NOTES]: context.notes as string | undefined,
      [SECTION_NAME_CHANGED_FILES]: changedFilesValue,
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
    const workspace = getWorkspacePath();
    if (!workspace) return;

    const filePath = path.join(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME);
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
      let changedFilesSectionMetadata: Record<string, unknown> | undefined;
      if (config?.branchContext?.builtinSections?.changedFiles !== false) {
        logger.info(`[syncBranchContext] Fetching changedFiles (+${Date.now() - startTime}ms)`);
        const result = await getChangedFilesWithSummary(workspace, ChangedFilesStyle.List);
        changedFiles = result.content;
        changedFilesSectionMetadata = result.sectionMetadata;
        logger.info(`[syncBranchContext] changedFiles done (+${Date.now() - startTime}ms)`);
      }

      const customAutoData: Record<string, string> = {};
      if (config?.branchContext?.customSections) {
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
      const sectionMetadataMap: Record<string, Record<string, unknown>> = {};
      if (changedFilesSectionMetadata) {
        sectionMetadataMap[SECTION_NAME_CHANGED_FILES] = changedFilesSectionMetadata;
      }

      let lastCommitHash: string | undefined;
      let lastCommitMessage: string | undefined;
      try {
        lastCommitHash = execSync(GIT_REV_PARSE_HEAD, { cwd: workspace, encoding: 'utf-8' }).trim();
        lastCommitMessage = execSync(GIT_LOG_LAST_COMMIT_MESSAGE, { cwd: workspace, encoding: 'utf-8' }).trim();
      } catch (error) {
        logger.error(`Failed to get git commit info: ${error}`);
      }

      await generateBranchContextMarkdown(
        this.currentBranch,
        {
          ...context,
          changedFiles,
          ...customAutoData,
          metadata: {
            lastSyncedTime: new Date().toISOString(),
            lastCommitMessage,
            lastCommitHash,
          },
        },
        Object.keys(sectionMetadataMap).length > 0 ? sectionMetadataMap : undefined,
      );

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
    this.templateWatcher?.dispose();
    this.validationIndicator.dispose();
  }
}
