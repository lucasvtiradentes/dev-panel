import { exec, execSync as nodeExecSync } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

type ExecAsyncOptions = {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

type ExecSyncOptions = {
  cwd?: string;
  encoding?: BufferEncoding;
};

export class ExecHelper {
  static async execAsync(command: string, options?: ExecAsyncOptions): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, {
      ...options,
      encoding: 'utf-8',
    });
  }

  static execSync(command: string, options?: ExecSyncOptions): string {
    return nodeExecSync(command, {
      ...options,
      encoding: 'utf-8',
    }).toString();
  }
}
