import * as vscode from 'vscode';
import { GLOBAL_ITEM_PREFIX } from '../constants';

export function isGlobalItem(name: string): boolean {
  return name.startsWith(GLOBAL_ITEM_PREFIX);
}

export function stripGlobalPrefix(name: string): string {
  return isGlobalItem(name) ? name.substring(GLOBAL_ITEM_PREFIX.length) : name;
}

export function showInvalidItemError(itemType: string): void {
  vscode.window.showErrorMessage(`Invalid ${itemType} selected`);
}

export function showAlreadyGlobalMessage(itemType: string): void {
  vscode.window.showInformationMessage(`This ${itemType} is already global`);
}

export function showAlreadyWorkspaceMessage(itemType: string): void {
  vscode.window.showInformationMessage(`This ${itemType} is already in workspace`);
}

export function showNotFoundError(itemType: string, itemName: string, location: 'global' | 'workspace'): void {
  vscode.window.showErrorMessage(`${itemType} "${itemName}" not found in ${location} config`);
}

export function showConfigNotFoundError(location: 'global' | 'workspace'): void {
  vscode.window.showErrorMessage(`${location.charAt(0).toUpperCase() + location.slice(1)} config not found`);
}

export function showNoItemsFoundError(itemType: string, location: 'global' | 'workspace'): void {
  vscode.window.showErrorMessage(`No ${itemType}s found in ${location} config`);
}

export function showCopySuccessMessage(itemType: string, itemName: string, destination: 'global' | 'workspace'): void {
  vscode.window.showInformationMessage(`✓ ${itemType} "${itemName}" copied to ${destination}`);
}

export function showDeleteSuccessMessage(itemType: string, itemName: string, isGlobal: boolean): void {
  const prefix = isGlobal ? 'Global ' : '';
  vscode.window.showInformationMessage(`✓ ${prefix}${itemType} "${itemName}" deleted`);
}
