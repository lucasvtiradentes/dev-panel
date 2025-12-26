import * as vscode from 'vscode';
import type { VscodeColor, VscodeColorString, VscodeIcon, VscodeIconString } from './vscode-constants';

export class VscodeHelper {
  static createIcon(icon: VscodeIcon, color?: VscodeColor): vscode.ThemeIcon {
    return color ? new vscode.ThemeIcon(icon, new vscode.ThemeColor(color)) : new vscode.ThemeIcon(icon);
  }

  static createCustomIcon(icon: VscodeIconString, color?: VscodeColorString): vscode.ThemeIcon {
    return color ? new vscode.ThemeIcon(icon, new vscode.ThemeColor(color)) : new vscode.ThemeIcon(icon);
  }
}
