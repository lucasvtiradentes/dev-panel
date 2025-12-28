import type { BranchTaskItem } from '../../views/branch-tasks/task-tree-items';
import { GLOBAL_ITEM_PREFIX } from '../constants';
import type { LocationScope } from '../constants/enums';
import { TypeGuardsHelper } from '../utils/helpers/type-guards-helper';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';

export type ItemOrLineIndex = BranchTaskItem | number;

export class TreeItemUtils {
  static extractLineIndex(itemOrLineIndex: ItemOrLineIndex): number {
    return TypeGuardsHelper.isNumber(itemOrLineIndex) ? itemOrLineIndex : itemOrLineIndex.node.lineIndex;
  }

  static isGlobalItem(name: string): boolean {
    return name.startsWith(GLOBAL_ITEM_PREFIX);
  }

  static stripGlobalPrefix(name: string): string {
    return TreeItemUtils.isGlobalItem(name) ? name.substring(GLOBAL_ITEM_PREFIX.length) : name;
  }

  static showInvalidItemError(itemType: string) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Invalid ${itemType} selected`);
  }

  static showAlreadyGlobalMessage(itemType: string) {
    VscodeHelper.showToastMessage(ToastKind.Info, `This ${itemType} is already global`);
  }

  static showAlreadyWorkspaceMessage(itemType: string) {
    VscodeHelper.showToastMessage(ToastKind.Info, `This ${itemType} is already in workspace`);
  }

  static showNotFoundError(itemType: string, itemName: string, location: LocationScope) {
    VscodeHelper.showToastMessage(ToastKind.Error, `${itemType} "${itemName}" not found in ${location} config`);
  }

  static showConfigNotFoundError(location: LocationScope) {
    VscodeHelper.showToastMessage(
      ToastKind.Error,
      `${location.charAt(0).toUpperCase() + location.slice(1)} config not found`,
    );
  }

  static showNoItemsFoundError(itemType: string, location: LocationScope) {
    VscodeHelper.showToastMessage(ToastKind.Error, `No ${itemType}s found in ${location} config`);
  }

  static showCopySuccessMessage(itemType: string, itemName: string, destination: LocationScope) {
    VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${itemType} "${itemName}" copied to ${destination}`);
  }

  static showDeleteSuccessMessage(itemType: string, itemName: string, isGlobal: boolean) {
    const prefix = isGlobal ? 'Global ' : '';
    VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${prefix}${itemType} "${itemName}" deleted`);
  }
}
