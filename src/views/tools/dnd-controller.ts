import * as vscode from 'vscode';
import type { ToolGroupTreeItem, TreeTool } from './items';
import { getOrder, saveOrder } from './state';

const MIME_TYPE = 'application/vnd.code.tree.projectpaneltools';

export class ToolDragAndDropController implements vscode.TreeDragAndDropController<TreeTool | ToolGroupTreeItem> {
  readonly dropMimeTypes = [MIME_TYPE];
  readonly dragMimeTypes = [MIME_TYPE];

  private _isGrouped: () => boolean;
  private _onReorder: () => void;

  constructor(getIsGrouped: () => boolean, onReorder: () => void) {
    this._isGrouped = getIsGrouped;
    this._onReorder = onReorder;
  }

  handleDrag(
    source: readonly (TreeTool | ToolGroupTreeItem)[],
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const item = source[0];
    if (!item) return;

    const label = typeof item.label === 'string' ? item.label : (item.label?.label ?? '');
    dataTransfer.set(MIME_TYPE, new vscode.DataTransferItem(label));
  }

  handleDrop(
    target: TreeTool | ToolGroupTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const transferItem = dataTransfer.get(MIME_TYPE);
    if (!transferItem || !target) return;

    const draggedLabel = transferItem.value as string;
    const targetLabel = typeof target.label === 'string' ? target.label : (target.label?.label ?? '');

    if (draggedLabel === targetLabel) return;

    this.reorderItems(draggedLabel, targetLabel);
    this._onReorder();
  }

  private reorderItems(draggedLabel: string, targetLabel: string): void {
    const isGrouped = this._isGrouped();
    const currentOrder = getOrder(isGrouped);
    const order = [...currentOrder];

    const draggedIndex = order.indexOf(draggedLabel);
    const targetIndex = order.indexOf(targetLabel);

    if (draggedIndex === -1 && targetIndex === -1) {
      order.push(targetLabel);
      order.push(draggedLabel);
    } else if (draggedIndex === -1) {
      order.splice(targetIndex, 0, draggedLabel);
    } else if (targetIndex === -1) {
      order.splice(draggedIndex, 1);
      order.push(targetLabel);
      order.push(draggedLabel);
    } else {
      order.splice(draggedIndex, 1);
      order.splice(targetIndex, 0, draggedLabel);
    }

    saveOrder(isGrouped, order);
  }
}
