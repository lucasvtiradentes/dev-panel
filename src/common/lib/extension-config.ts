import { IS_DEV } from '../constants/constants';
import { CONTEXT_PREFIX, DEV_SUFFIX } from '../constants/scripts-constants';
import { VscodeHelper } from '../vscode/vscode-helper';

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
