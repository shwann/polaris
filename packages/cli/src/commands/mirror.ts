import { embedData } from '@polaris/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Snapshot } from '@polaris/core';
import { page, asset } from '../server.js';
export function mirror(data: Snapshot, out: string, file: string | URL = asset): string {
  const html = embedData(page(file), data);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return out;
}
