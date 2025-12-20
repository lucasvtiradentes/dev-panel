import { tasksState } from '../../common/lib/workspace-state';
import { TaskSource } from '../../common/schemas/types';

export const loadTasksState = tasksState.load.bind(tasksState);
export const saveTasksState = tasksState.save.bind(tasksState);

export function getSourceStateKey(source: TaskSource): 'vscode' | 'packageJson' | 'bpm' {
  switch (source) {
    case TaskSource.VSCode:
      return 'vscode';
    case TaskSource.Package:
      return 'packageJson';
    case TaskSource.BPM:
      return 'bpm';
  }
}

export const getSourceState = (source: TaskSource) => tasksState.getSourceState(source);
export const getOrder = (source: TaskSource, isGrouped: boolean) => tasksState.getOrder(source, isGrouped);
export const saveSourceOrder = (source: TaskSource, isGrouped: boolean, order: string[]) =>
  tasksState.saveOrder(source, isGrouped, order);
export const toggleFavorite = (source: TaskSource, itemName: string) => tasksState.toggleFavorite(source, itemName);
export const toggleHidden = (source: TaskSource, itemName: string) => tasksState.toggleHidden(source, itemName);
export const isFavorite = (source: TaskSource, itemName: string) => tasksState.isFavorite(source, itemName);
export const isHidden = (source: TaskSource, itemName: string) => tasksState.isHidden(source, itemName);
export const getCurrentSource = () => tasksState.getCurrentSource();
export const saveCurrentSource = (source: TaskSource) => tasksState.saveCurrentSource(source);
export const getIsGrouped = () => tasksState.getIsGrouped();
export const saveIsGrouped = (isGrouped: boolean) => tasksState.saveIsGrouped(isGrouped);
export const getShowHidden = (source: TaskSource) => tasksState.getShowHidden(source);
export const saveShowHidden = (source: TaskSource, showHidden: boolean) =>
  tasksState.saveShowHidden(source, showHidden);
export const getHiddenItems = (source: TaskSource) => tasksState.getHiddenItems(source);
export const getShowOnlyFavorites = (source: TaskSource) => tasksState.getShowOnlyFavorites(source);
export const saveShowOnlyFavorites = (source: TaskSource, showOnlyFavorites: boolean) =>
  tasksState.saveShowOnlyFavorites(source, showOnlyFavorites);
export const getFavoriteItems = (source: TaskSource) => tasksState.getFavoriteItems(source);
