import { DEFAULT_PROMPTS_STATE, DEFAULT_SOURCE_STATE, type PromptsState, type SourceState } from '../../schemas';
import { TaskSource } from '../../schemas/types';
import { getState, saveState } from './base';

export const promptsState = {
  load(): PromptsState {
    return getState().prompts ?? { ...DEFAULT_PROMPTS_STATE };
  },
  save(newPromptsState: PromptsState) {
    const state = getState();
    state.prompts = newPromptsState;
    saveState(state);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },
  saveIsGrouped(isGrouped: boolean) {
    const prompts = this.load();
    prompts.isGrouped = isGrouped;
    this.save(prompts);
  },
  getShowHidden(): boolean {
    return this.load().showHidden ?? false;
  },
  saveShowHidden(showHidden: boolean) {
    const prompts = this.load();
    prompts.showHidden = showHidden;
    this.save(prompts);
  },
  getHiddenItems(): string[] {
    return this.getSourceState().hidden;
  },
  getShowOnlyFavorites(): boolean {
    return this.load().showOnlyFavorites ?? false;
  },
  saveShowOnlyFavorites(showOnlyFavorites: boolean) {
    const prompts = this.load();
    prompts.showOnlyFavorites = showOnlyFavorites;
    this.save(prompts);
  },
  getFavoriteItems(): string[] {
    return this.getSourceState().favorites;
  },
  getSourceState(): SourceState {
    return this.load()[TaskSource.DevPanel] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(sourceState: SourceState) {
    const prompts = this.load();
    prompts[TaskSource.DevPanel] = sourceState;
    this.save(prompts);
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
};
