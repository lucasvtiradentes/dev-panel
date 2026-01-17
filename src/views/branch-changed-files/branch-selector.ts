import { Git } from '../../common/lib/git';
import { VscodeIcon } from '../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import type { QuickPickItem } from '../../common/vscode/vscode-types';
import type { BranchChangedFilesProvider } from './provider';

export async function showBranchSelectorQuickPick(provider: BranchChangedFilesProvider) {
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) return;

  const branches = await Git.getRemoteBranches(workspace);
  if (branches.length === 0) {
    void VscodeHelper.showToastMessage(ToastKind.Warning, 'No remote branches found');
    return;
  }

  const currentBranch = provider.getComparisonBranch();

  const items: QuickPickItem[] = branches.map((branch) => ({
    label: branch === currentBranch ? `$(${VscodeIcon.Check}) ${branch}` : branch,
    description: branch === currentBranch ? 'current' : undefined,
  }));

  const picked = await VscodeHelper.showQuickPickItems(items, {
    placeHolder: 'Select comparison branch',
  });

  if (!picked) return;

  const selectedBranch = picked.label.replace(`$(${VscodeIcon.Check}) `, '');
  await provider.setComparisonBranch(selectedBranch);
}
