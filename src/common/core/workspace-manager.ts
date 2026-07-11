import { VscodeHelper } from '../vscode/vscode-helper';
import type { Disposable, Event, EventEmitter, ExtensionContext, WorkspaceFolder } from '../vscode/vscode-types';

const ACTIVE_WORKSPACE_KEY = 'devPanel.activeWorkspaceUri';

class WorkspaceManager implements Disposable {
  private readonly onDidChangeEmitter: EventEmitter<WorkspaceFolder | undefined> = VscodeHelper.createEventEmitter();
  readonly onDidChangeActiveWorkspace: Event<WorkspaceFolder | undefined> = this.onDidChangeEmitter.event;
  private context: ExtensionContext | null = null;
  private foldersListener: Disposable | null = null;
  private activeUri: string | null = null;

  initialize(context: ExtensionContext) {
    this.context = context;
    this.activeUri = context.workspaceState.get<string>(ACTIVE_WORKSPACE_KEY) ?? null;
    this.ensureValidSelection();
    this.foldersListener = VscodeHelper.onDidChangeWorkspaceFolders(() => {
      this.ensureValidSelection();
      this.onDidChangeEmitter.fire(this.getActiveFolder());
    });
  }

  getAllFolders(): readonly WorkspaceFolder[] {
    return VscodeHelper.getAllWorkspaceFolders();
  }

  getActiveFolder(): WorkspaceFolder | undefined {
    const folders = this.getAllFolders();
    return folders.find((folder) => folder.uri.toString() === this.activeUri) ?? folders[0];
  }

  async selectActiveWorkspace(): Promise<void> {
    const folders = this.getAllFolders();
    if (folders.length < 2) return;

    const selected = await VscodeHelper.showQuickPickItems(
      folders.map((folder) => ({
        label: folder.name,
        description: folder.uri.toString() === this.activeUri ? '(current)' : undefined,
        folder,
      })),
      { placeHolder: 'Select the active Dev Panel workspace' },
    );
    if (!selected) return;
    this.setActiveFolder(selected.folder);
  }

  private setActiveFolder(folder: WorkspaceFolder) {
    const nextUri = folder.uri.toString();
    if (nextUri === this.activeUri) return;
    this.activeUri = nextUri;
    VscodeHelper.setActiveWorkspaceUri(nextUri);
    void this.context?.workspaceState.update(ACTIVE_WORKSPACE_KEY, nextUri);
    this.onDidChangeEmitter.fire(folder);
  }

  private ensureValidSelection() {
    const folders = this.getAllFolders();
    const activeExists = folders.some((folder) => folder.uri.toString() === this.activeUri);
    const activeFolder = activeExists ? this.getActiveFolder() : folders[0];
    this.activeUri = activeFolder?.uri.toString() ?? null;
    VscodeHelper.setActiveWorkspaceUri(this.activeUri);
    void this.context?.workspaceState.update(ACTIVE_WORKSPACE_KEY, this.activeUri);
  }

  dispose() {
    this.foldersListener?.dispose();
    this.onDidChangeEmitter.dispose();
  }
}

export const workspaceManager = new WorkspaceManager();
