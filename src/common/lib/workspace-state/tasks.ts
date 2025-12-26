import { DEFAULT_SOURCE_STATE, DEFAULT_TASKS_STATE, type SourceState, type TasksState } from '../../schemas';
import { TaskSource } from '../../schemas/types';
import { getState, saveState } from './base';

export const tasksState = {
  load(): TasksState {
    return getState().tasks ?? { ...DEFAULT_TASKS_STATE };
  },
  save(newTasksState: TasksState) {
    const state = getState();
    state.tasks = newTasksState;
    saveState(state);
  },
  getCurrentSource(): TaskSource {
    const tasks = this.load();
    return (tasks.current as TaskSource) ?? TaskSource.VSCode;
  },
  saveCurrentSource(source: TaskSource) {
    const tasks = this.load();
    tasks.current = source;
    this.save(tasks);
  },
  getIsGrouped(): boolean {
    return this.load().isGrouped ?? false;
  },
  saveIsGrouped(isGrouped: boolean) {
    const tasks = this.load();
    tasks.isGrouped = isGrouped;
    this.save(tasks);
  },
  getSourceState(source: TaskSource): SourceState {
    const tasks = this.load();
    return tasks[source] ?? { ...DEFAULT_SOURCE_STATE };
  },
  saveSourceState(source: TaskSource, sourceState: SourceState) {
    const tasks = this.load();
    tasks[source] = sourceState;
    this.save(tasks);
  },
  getOrder(source: TaskSource, isGrouped: boolean): string[] {
    const sourceState = this.getSourceState(source);
    return isGrouped ? sourceState.groupOrder : sourceState.flatOrder;
  },
  saveOrder(source: TaskSource, isGrouped: boolean, order: string[]) {
    const sourceState = this.getSourceState(source);
    if (isGrouped) {
      sourceState.groupOrder = order;
    } else {
      sourceState.flatOrder = order;
    }
    this.saveSourceState(source, sourceState);
  },
  isFavorite(source: TaskSource, name: string): boolean {
    return this.getSourceState(source).favorites.includes(name);
  },
  toggleFavorite(source: TaskSource, name: string): boolean {
    const sourceState = this.getSourceState(source);
    const index = sourceState.favorites.indexOf(name);
    if (index === -1) {
      sourceState.favorites.push(name);
    } else {
      sourceState.favorites.splice(index, 1);
    }
    this.saveSourceState(source, sourceState);
    return index === -1;
  },
  isHidden(source: TaskSource, name: string): boolean {
    return this.getSourceState(source).hidden.includes(name);
  },
  toggleHidden(source: TaskSource, name: string): boolean {
    const sourceState = this.getSourceState(source);
    const index = sourceState.hidden.indexOf(name);
    if (index === -1) {
      sourceState.hidden.push(name);
    } else {
      sourceState.hidden.splice(index, 1);
    }
    this.saveSourceState(source, sourceState);
    return index === -1;
  },
  getShowHidden(source: TaskSource): boolean {
    return this.getSourceState(source).showHidden ?? false;
  },
  saveShowHidden(source: TaskSource, showHidden: boolean) {
    const sourceState = this.getSourceState(source);
    sourceState.showHidden = showHidden;
    this.saveSourceState(source, sourceState);
  },
  getHiddenItems(source: TaskSource): string[] {
    return this.getSourceState(source).hidden;
  },
  getShowOnlyFavorites(source: TaskSource): boolean {
    return this.getSourceState(source).showOnlyFavorites ?? false;
  },
  saveShowOnlyFavorites(source: TaskSource, showOnlyFavorites: boolean) {
    const sourceState = this.getSourceState(source);
    sourceState.showOnlyFavorites = showOnlyFavorites;
    this.saveSourceState(source, sourceState);
  },
  getFavoriteItems(source: TaskSource): string[] {
    return this.getSourceState(source).favorites;
  },
};
