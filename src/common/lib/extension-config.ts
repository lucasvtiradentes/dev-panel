import * as vscode from 'vscode';
import { EXTENSION_PREFIX } from '../constants';

export enum ExtensionConfigKey {
  AutoRefresh = 'autorefresh',
}

type ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: boolean;
};

const defaultValues: ExtensionConfigSchema = {
  [ExtensionConfigKey.AutoRefresh]: true,
};

export function getExtensionConfig<K extends ExtensionConfigKey>(key: K): ExtensionConfigSchema[K] {
  const config = vscode.workspace.getConfiguration(EXTENSION_PREFIX);
  return config.get<ExtensionConfigSchema[K]>(key) ?? defaultValues[key];
}
