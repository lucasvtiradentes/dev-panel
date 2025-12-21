import { toolsState } from '../../common/lib/workspace-state';
import { createDragAndDropController } from '../common';
import type { TreeTool } from './items';

const MIME_TYPE = 'application/vnd.code.tree.projectpaneltools';

export class ToolDragAndDropController {
  private controller: ReturnType<typeof createDragAndDropController<TreeTool>>;

  constructor(getIsGrouped: () => boolean, onReorder: () => void) {
    this.controller = createDragAndDropController<TreeTool>(MIME_TYPE, toolsState, getIsGrouped, onReorder);
  }

  get dropMimeTypes() {
    return this.controller.dropMimeTypes;
  }

  get dragMimeTypes() {
    return this.controller.dragMimeTypes;
  }

  handleDrag(...args: Parameters<typeof this.controller.handleDrag>) {
    return this.controller.handleDrag(...args);
  }

  handleDrop(...args: Parameters<typeof this.controller.handleDrop>) {
    return this.controller.handleDrop(...args);
  }
}
