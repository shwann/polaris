import { dirname, resolve } from 'node:path';

export function codexSandboxAdvice(home: string): string {
  return process.env.CODEX_SANDBOX
    ? `当前在 Codex 沙箱中，数据目录不可写。请在 ~/.codex/config.toml 的 [sandbox_workspace_write] 下把 writable_roots 加上 ${JSON.stringify(resolve(home))}，或用 POLARIS_HOME 指到工作区内。`
    : '';
}

export function databaseOpenError(error: unknown, path: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  const advice = codexSandboxAdvice(dirname(path));
  return new Error(`无法打开数据库 ${path}：${message}${advice ? `。${advice}` : ''}`, { cause: error });
}
