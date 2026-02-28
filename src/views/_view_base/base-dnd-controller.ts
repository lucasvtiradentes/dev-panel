import { TypeGuardsHelper } from '../../common/utils/helpers/type-guards-helper';
import { VscodeHelper } from '../../common/vscode/vscode-helper';
import type { CancellationToken, DataTransfer, TreeDragAndDropController } from '../../common/vscode/vscode-types';
import type { NamedTreeItem, StateManager } from './types';

export class BaseDragAndDropController<TItem extends NamedTreeItem, TSource = void>
  implements TreeDragAndDropController<TItem>
{
  readonly dropMimeTypes: string[];
  readonly dragMimeTypes: string[];

  constructor(
    private readonly mimeType: string,
    private readonly stateManager: StateManager<TSource>,
    private readonly getIsGrouped: () => boolean,
    private readonly getSource: () => TSource,
    private readonly onReorder: () => void,
  ) {
    this.dropMimeTypes = [mimeType];
    this.dragMimeTypes = [mimeType];
  }

  handleDrag(source: readonly TItem[], dataTransfer: DataTransfer, _token: CancellationToken) {
    const item = source[0];
    if (!item) return;

    const label = this.getItemLabel(item);
    dataTransfer.set(this.mimeType, VscodeHelper.createDataTransferItem(label));
  }

  handleDrop(target: TItem | undefined, dataTransfer: DataTransfer, _token: CancellationToken) {
    const transferItem = dataTransfer.get(this.mimeType);
    if (!transferItem || !target) return;

    const draggedLabel = transferItem.value as string;
    const targetLabel = this.getItemLabel(target);

    if (draggedLabel === targetLabel) return;

    this.reorderItems(draggedLabel, targetLabel);
    this.onReorder();
  }

  private getItemLabel(item: TItem): string {
    return TypeGuardsHelper.getTreeItemLabel(item);
  }

  private reorderItems(draggedLabel: string, targetLabel: string) {
    const isGrouped = this.getIsGrouped();
    const source = this.getSource();
    const currentOrder = this.stateManager.getOrder(source, isGrouped);
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

    this.stateManager.saveOrder(source, isGrouped, order);
  }
}

export function createSourcedDragAndDropController<TItem extends NamedTreeItem, TSource>(options: {
  mimeType: string;
  stateManager: StateManager<TSource>;
  getIsGrouped: () => boolean;
  getSource: () => TSource;
  onReorder: () => void;
}): BaseDragAndDropController<TItem, TSource> {
  const { mimeType, stateManager, getIsGrouped, getSource, onReorder } = options;
  return new BaseDragAndDropController(mimeType, stateManager, getIsGrouped, getSource, onReorder);
}
