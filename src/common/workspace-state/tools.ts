import { DEFAULT_SOURCE_STATE, DEFAULT_TOOLS_STATE, type SourceState, type ToolsState } from '../schemas';
import { TaskSource } from '../schemas/types';
import { getState, saveState } from './base';

export const toolsState = {
  load(): ToolsState {
    return getState().tools ?? { ...DEFAULT_TOOLS_STATE };
  },
  save(newToolsState: ToolsState) {
    const state = getState();
    state.tools = newToolsState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },
  saveIsGrouped(isGrouped: boolean) {
    const tools = this.load();
    tools.isGrouped = isGrouped;
    this.save(tools);
  },
  getShowHidden(): boolean {
    return this.load().showHidden ?? false;
  },
  saveShowHidden(showHidden: boolean) {
    const tools = this.load();
    tools.showHidden = showHidden;
    this.save(tools);
  },
  getHiddenItems(): string[] {
    return this.getSourceState().hidden;
  },
  getShowOnlyFavorites(): boolean {
    return this.load().showOnlyFavorites ?? false;
  },
  saveShowOnlyFavorites(showOnlyFavorites: boolean) {
    const tools = this.load();
    tools.showOnlyFavorites = showOnlyFavorites;
    this.save(tools);
  },
  getFavoriteItems(): string[] {
    return this.getSourceState().favorites;
  },
  getSourceState(): SourceState {
    return this.load()[TaskSource.DevPanel] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState) {
    const tools = this.load();
    tools[TaskSource.DevPanel] = sourceState;
    this.save(tools);
  },
  getOrder(isGrouped: boolean): string[] {
    const sourceState = this.getSourceState();
    return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
  },
  saveOrder(isGrouped: boolean, order: string[]) {
    const sourceState = this.getSourceState();
    if (isGrouped) {
      sourceState.groupOrder = order;
    } else {
      sourceState.flatOrder = order;
    }
    this.saveSourceState(sourceState);
  },
  isFavorite(name: string): boolean {
    return this.getSourceState().favorites.includes(name);
  },
  toggleFavorite(name: string): boolean {
    const sourceState = this.getSourceState();
    const index = sourceState.favorites.indexOf(name);
    if (index === -1) {
      sourceState.favorites.push(name);
    } else {
      sourceState.favorites.splice(index, 1);
    }
    this.saveSourceState(sourceState);
    return index === -1;
  },
  isHidden(name: string): boolean {
    return this.getSourceState().hidden.includes(name);
  },
  toggleHidden(name: string): boolean {
    const sourceState = this.getSourceState();
    const index = sourceState.hidden.indexOf(name);
    if (index === -1) {
      sourceState.hidden.push(name);
    } else {
      sourceState.hidden.splice(index, 1);
    }
    this.saveSourceState(sourceState);
    return index === -1;
  },
  getActiveTools(): string[] {
    return this.load().activeTools ?? [];
  },
  setActiveTools(active: string[]) {
    const tools = this.load();
    tools.activeTools = active;
    this.save(tools);
  },
  addActiveTool(name: string) {
    const tools = this.load();
    if (!tools.activeTools) {
      tools.activeTools = [];
    }
    if (!tools.activeTools.includes(name)) {
      tools.activeTools.push(name);
      this.save(tools);
    }
  },
  removeActiveTool(name: string) {
    const tools = this.load();
    if (tools.activeTools) {
      tools.activeTools = tools.activeTools.filter((n: string) => n !== name);
      this.save(tools);
    }
  },
};
