export function supportedNode(version = process.versions.node): boolean {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 13);
}
export const runtimeAdvice = (version = process.versions.node) =>
  `当前 Node ${version}；北辰需要 Node 22.13 或以上版本及 node:sqlite，请从 https://nodejs.org 安装新版 LTS，并移除 --no-experimental-sqlite`;

export async function sqliteAvailable(): Promise<boolean> {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    return typeof DatabaseSync === 'function';
  } catch {
    return false;
  }
}
export function suppressSqliteWarning(): void {
  const original = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
    const type =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] && typeof args[0] === 'object' && 'type' in args[0]
          ? args[0].type
          : warning instanceof Error
            ? warning.name
            : undefined;
    const message = typeof warning === 'string' ? warning : warning.message;
    if (type === 'ExperimentalWarning' && message === 'SQLite is an experimental feature and might change at any time')
      return;
    Reflect.apply(original, process, [warning, ...args]);
  }) as typeof process.emitWarning;
}
