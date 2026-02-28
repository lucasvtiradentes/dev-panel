import { GLOBAL_ITEM_PREFIX } from '../constants';
import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';

export class TreeItemUtils {
  static isGlobalItem(name: string): boolean {
    return name.startsWith(GLOBAL_ITEM_PREFIX);
  }

  static stripGlobalPrefix(name: string): string {
    return TreeItemUtils.isGlobalItem(name) ? name.substring(GLOBAL_ITEM_PREFIX.length) : name;
  }

  static showInvalidItemError(itemType: string) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Invalid ${itemType} selected`);
  }
}
