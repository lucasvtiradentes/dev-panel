import type * as vscode from 'vscode';
import { logger } from './logger';

export enum StoreKey {
  ConfigDir = 'configDir',
}

type ExtensionState = {
  [StoreKey.ConfigDir]: string | null;
};

type StateListener<K extends StoreKey> = (value: ExtensionState[K], oldValue: ExtensionState[K]) => void;
type AnyStateListener = StateListener<StoreKey>;

class ExtensionStore {
  private state: ExtensionState = {
    [StoreKey.ConfigDir]: null,
  };

  private context: vscode.ExtensionContext | null = null;
  private listeners = new Map<StoreKey, Set<AnyStateListener>>();

  initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    const stored = context.workspaceState.get<string | null>('pp.configDir');
    this.state[StoreKey.ConfigDir] = stored ?? null;
  }

  get<K extends StoreKey>(key: K): ExtensionState[K] {
    return this.state[key];
  }

  set<K extends StoreKey>(key: K, value: ExtensionState[K]): void {
    const oldValue = this.state[key];
    if (oldValue === value) return;

    this.state[key] = value;
    this.persist(key, value);
    this.notify(key, value, oldValue);
  }

  subscribe<K extends StoreKey>(key: K, listener: StateListener<K>): () => void {
    let keyListeners = this.listeners.get(key);
    if (!keyListeners) {
      keyListeners = new Set();
      this.listeners.set(key, keyListeners);
    }
    keyListeners.add(listener as AnyStateListener);
    return () => {
      this.listeners.get(key)?.delete(listener as AnyStateListener);
    };
  }

  private persist<K extends StoreKey>(key: K, value: ExtensionState[K]): void {
    if (!this.context) return;

    switch (key) {
      case StoreKey.ConfigDir:
        void this.context.workspaceState.update('pp.configDir', value as string | null);
        break;
    }
  }

  private notify<K extends StoreKey>(key: K, value: ExtensionState[K], oldValue: ExtensionState[K]): void {
    const keyListeners = this.listeners.get(key);
    if (!keyListeners) return;

    for (const listener of keyListeners) {
      try {
        listener(value, oldValue);
      } catch (err) {
        logger.error(`Listener error for ${key}: ${err}`);
      }
    }
  }
}

export const extensionStore = new ExtensionStore();
