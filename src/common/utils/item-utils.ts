import { GLOBAL_ITEM_PREFIX } from '../constants';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';

export function isGlobalItem(name: string): boolean {
  return name.startsWith(GLOBAL_ITEM_PREFIX);
}

export function stripGlobalPrefix(name: string): string {
  return isGlobalItem(name) ? name.substring(GLOBAL_ITEM_PREFIX.length) : name;
}

export function showInvalidItemError(itemType: string) {
  VscodeHelper.showToastMessage(ToastKind.Error, `Invalid ${itemType} selected`);
}

export function showAlreadyGlobalMessage(itemType: string) {
  VscodeHelper.showToastMessage(ToastKind.Info, `This ${itemType} is already global`);
}

export function showAlreadyWorkspaceMessage(itemType: string) {
  VscodeHelper.showToastMessage(ToastKind.Info, `This ${itemType} is already in workspace`);
}

export function showNotFoundError(itemType: string, itemName: string, location: 'global' | 'workspace') {
  VscodeHelper.showToastMessage(ToastKind.Error, `${itemType} "${itemName}" not found in ${location} config`);
}

export function showConfigNotFoundError(location: 'global' | 'workspace') {
  VscodeHelper.showToastMessage(
    ToastKind.Error,
    `${location.charAt(0).toUpperCase() + location.slice(1)} config not found`,
  );
}

export function showNoItemsFoundError(itemType: string, location: 'global' | 'workspace') {
  VscodeHelper.showToastMessage(ToastKind.Error, `No ${itemType}s found in ${location} config`);
}

export function showCopySuccessMessage(itemType: string, itemName: string, destination: 'global' | 'workspace') {
  VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${itemType} "${itemName}" copied to ${destination}`);
}

export function showDeleteSuccessMessage(itemType: string, itemName: string, isGlobal: boolean) {
  const prefix = isGlobal ? 'Global ' : '';
  VscodeHelper.showToastMessage(ToastKind.Info, `✓ ${prefix}${itemType} "${itemName}" deleted`);
}
