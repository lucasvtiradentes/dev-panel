import { UTF_ENCODING, execAsyncFn } from '../lib/node-helper';

type ExecAsyncOptions = {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export async function execAsync(
  command: string,
  options?: ExecAsyncOptions,
): Promise<{ stdout: string; stderr: string }> {
  return execAsyncFn(command, {
    ...options,
    encoding: UTF_ENCODING,
  });
}
