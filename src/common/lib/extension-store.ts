import { IS_DEV } from '../constants/constants';
import { CONTEXT_PREFIX, DEV_SUFFIX, WORKSPACE_STATE_CONFIG_DIR_KEY } from '../constants/scripts-constants';
import { VscodeHelper } from '../vscode/vscode-helper';
import type { ExtensionContext, Uri } from '../vscode/vscode-types';
import { logger } from './logger';

export enum StoreKey {
  ConfigDir = 'configDir',
  IsWritingBranchContext = 'isWritingBranchContext',
}

type ExtensionState = {
  [StoreKey.ConfigDir]: string | null;
  [StoreKey.IsWritingBranchContext]: boolean;
};

type StateListener<K extends StoreKey> = (value: ExtensionState[K], oldValue: ExtensionState[K]) => void;
type AnyStateListener = StateListener<StoreKey>;

class ExtensionStore {
  private state: ExtensionState = {
    [StoreKey.ConfigDir]: null,
    [StoreKey.IsWritingBranchContext]: false,
  };

  private context: ExtensionContext | null = null;
  private listeners = new Map<StoreKey, Set<AnyStateListener>>();

  initialize(context: ExtensionContext) {
    this.context = context;
    const stored = context.workspaceState.get<string | null>(WORKSPACE_STATE_CONFIG_DIR_KEY);
    this.state[StoreKey.ConfigDir] = stored ?? null;
  }

  getExtensionUri(): Uri | null {
    return this.context?.extensionUri ?? null;
  }

  getExtensionPath(): string {
    if (!this.context) {
      throw new Error('Extension context not initialized');
    }
    return this.context.extensionPath;
  }

  get<K extends StoreKey>(key: K): ExtensionState[K] {
    return this.state[key];
  }

  set<K extends StoreKey>(key: K, value: ExtensionState[K]) {
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

  private persist<K extends StoreKey>(key: K, value: ExtensionState[K]) {
    if (!this.context) return;

    switch (key) {
      case StoreKey.ConfigDir:
        void this.context.workspaceState.update(WORKSPACE_STATE_CONFIG_DIR_KEY, value as string | null);
        break;
    }
  }

  private notify<K extends StoreKey>(key: K, value: ExtensionState[K], oldValue: ExtensionState[K]) {
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

export enum ExtensionConfigKey {
  AutoRefresh = 'autorefresh',
}

type ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: boolean;
};

const defaultValues: ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: true,
};

function getConfigSection(): string {
  return IS_DEV ? `${CONTEXT_PREFIX}${DEV_SUFFIX}` : CONTEXT_PREFIX;
}

export function getExtensionConfig<K extends ExtensionConfigKey>(key: K): ExtensionConfigSchema[K] {
  const config = VscodeHelper.getConfiguration(getConfigSection());
  return config.get<ExtensionConfigSchema[K]>(key) ?? defaultValues[key];
}
