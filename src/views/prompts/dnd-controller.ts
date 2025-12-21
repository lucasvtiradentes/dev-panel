import { DND_MIME_TYPE_PROMPTS } from '../../common/constants';
import { promptsState } from '../../common/lib/workspace-state';
import { createDragAndDropController } from '../common';
import type { TreePrompt } from './items';

export class PromptDragAndDropController {
  private controller: ReturnType<typeof createDragAndDropController<TreePrompt>>;

  constructor(getIsGrouped: () => boolean, onReorder: () => void) {
    this.controller = createDragAndDropController<TreePrompt>(
      DND_MIME_TYPE_PROMPTS,
      promptsState,
      getIsGrouped,
      onReorder,
    );
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
