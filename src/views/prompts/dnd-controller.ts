import { promptsState } from '../../common/lib/workspace-state';
import { createDragAndDropController } from '../common';
import type { TreePrompt } from './items';

const MIME_TYPE = 'application/vnd.code.tree.projectpanelprompts';

export class PromptDragAndDropController {
  private controller: ReturnType<typeof createDragAndDropController<TreePrompt>>;

  constructor(getIsGrouped: () => boolean, onReorder: () => void) {
    this.controller = createDragAndDropController<TreePrompt>(MIME_TYPE, promptsState, getIsGrouped, onReorder);
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
