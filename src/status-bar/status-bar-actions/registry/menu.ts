import { EXTENSION_DISPLAY_NAME } from '../../../common/constants';
import { logger } from '../../../common/lib/logger';
import { type RegistryItemEntry, RegistryItemKind } from '../../../common/schemas';
import { VscodeConstants, VscodeIcon } from '../../../common/vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { QuickPickItem, WorkspaceFolder } from '../../../common/vscode/vscode-types';
import { requireWorkspaceFolder } from '../../../common/vscode/workspace-utils';
import { fetchRegistryIndex, getInstalledItems, getItemsForKind, installItem } from './service';

type QuickPickItemWithId<T> = QuickPickItem & { id: T };

const KIND_LABELS: Record<RegistryItemKind, { label: string; icon: VscodeIcon }> = {
  [RegistryItemKind.Plugin]: { label: 'Plugins', icon: VscodeIcon.Extensions },
  [RegistryItemKind.Prompt]: { label: 'Prompts', icon: VscodeIcon.CommentDiscussion },
  [RegistryItemKind.Tool]: { label: 'Tools', icon: VscodeIcon.Tools },
  [RegistryItemKind.Script]: { label: 'Scripts', icon: VscodeIcon.Terminal },
};

export async function showRegistryMenu() {
  const workspaceFolder = requireWorkspaceFolder();
  if (!workspaceFolder) return;

  const kindItems: QuickPickItemWithId<RegistryItemKind>[] = Object.entries(KIND_LABELS).map(
    ([kind, { label, icon }]) => ({
      id: kind as RegistryItemKind,
      label: `$(${icon}) ${label}`,
      detail: `Browse ${label.toLowerCase()} from registry`,
    }),
  );

  const selectedKind = await VscodeHelper.showQuickPickItems(kindItems, {
    placeHolder: 'Select category to browse',
    ignoreFocusOut: false,
  });

  if (!selectedKind) return;

  await showItemsForKind(workspaceFolder, selectedKind.id);
}

async function showItemsForKind(workspaceFolder: WorkspaceFolder, kind: RegistryItemKind) {
  const kindLabel = KIND_LABELS[kind].label;

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Fetching ${kindLabel.toLowerCase()} from registry...`,
      cancellable: false,
    },
    async () => {
      try {
        const index = await fetchRegistryIndex();
        const items = getItemsForKind(index, kind);

        if (items.length === 0) {
          void VscodeHelper.showToastMessage(ToastKind.Info, `No ${kindLabel.toLowerCase()} available in registry`);
          return;
        }

        const installedItems = getInstalledItems(workspaceFolder.uri.fsPath, kind);

        const quickPickItems: QuickPickItemWithId<RegistryItemEntry | null>[] = items.map((item) => {
          const isInstalled = installedItems.includes(item.name);
          return {
            id: item,
            label: `${isInstalled ? '$(check) ' : ''}${item.name}`,
            description: item.category,
            detail: item.description,
            picked: false,
          };
        });

        quickPickItems.unshift({
          id: null,
          label: '$(arrow-left) Back',
          detail: 'Return to category selection',
        });

        const selected = await VscodeHelper.showQuickPickItems(quickPickItems, {
          placeHolder: `Select ${kindLabel.toLowerCase()} to install`,
          ignoreFocusOut: false,
          canPickMany: true,
        });

        if (!selected || selected.length === 0) return;

        const itemsToInstall = selected
          .filter((s): s is QuickPickItemWithId<RegistryItemEntry> => s.id !== null)
          .map((s) => s.id);

        if (itemsToInstall.length === 0) {
          await showRegistryMenu();
          return;
        }

        await installItems(workspaceFolder, kind, itemsToInstall);
      } catch (error) {
        logger.error(`Failed to fetch registry: ${error}`);
        void VscodeHelper.showToastMessage(ToastKind.Error, `Failed to fetch registry: ${error}`);
      }
    },
  );
}

async function installItems(workspaceFolder: WorkspaceFolder, kind: RegistryItemKind, items: RegistryItemEntry[]) {
  const kindLabel = KIND_LABELS[kind].label.toLowerCase();

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Installing ${items.length} ${kindLabel}...`,
      cancellable: false,
    },
    async (progress) => {
      let installed = 0;
      let failed = 0;

      for (const item of items) {
        try {
          progress.report({
            message: `Installing ${item.name}...`,
            increment: 100 / items.length,
          });

          await installItem(workspaceFolder, kind, item, false);
          installed++;
        } catch (error) {
          logger.error(`Failed to install ${item.name}: ${error}`);

          const overwrite = await VscodeHelper.showToastMessage(
            ToastKind.Warning,
            `"${item.name}" already exists. Overwrite?`,
            'Overwrite',
            'Skip',
          );

          if (overwrite === 'Overwrite') {
            try {
              await installItem(workspaceFolder, kind, item, true);
              installed++;
            } catch {
              failed++;
            }
          } else {
            failed++;
          }
        }
      }

      if (installed > 0) {
        void VscodeHelper.showToastMessage(
          ToastKind.Info,
          `${EXTENSION_DISPLAY_NAME}: Installed ${installed} ${kindLabel}${failed > 0 ? ` (${failed} failed)` : ''}`,
        );
      }
    },
  );
}
