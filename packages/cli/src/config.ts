import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

export interface Config {
  home: string;
  path: string;
  actor: string;
  system?: string;
}
export function config(options: { home?: string; actor?: string; system?: string }, cwd = process.cwd()): Config {
  let system = options.system;
  for (let dir = resolve(cwd); !system; dir = dirname(dir)) {
    const file = join(dir, '.polaris.json');
    if (existsSync(file)) {
      const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
      if (!value || typeof value !== 'object' || !('system' in value) || typeof value.system !== 'string')
        throw new Error('.polaris.json 必须包含字符串 system');
      system = value.system;
      break;
    }
    if (dirname(dir) === dir) break;
  }
  const home = dataHome(options.home);
  return { home, path: join(home, 'polaris.db'), actor: options.actor || process.env.POLARIS_ACTOR || 'user', system };
}

export function dataHome(home?: string): string {
  return resolve(home || process.env.POLARIS_HOME || join(homedir(), 'Documents', 'polaris-data'));
}
