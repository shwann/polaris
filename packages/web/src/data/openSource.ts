import { readEmbedded } from '@polaris/core';
import type { DataSource, SourceHost } from './DataSource';
import { inlineSource } from './inlineSource';
import { localSource } from './localSource';
import { artifactSource } from './artifactSource';
export async function openSource(
  host: SourceHost = window,
  slot = document.getElementById('polaris-data')?.textContent,
): Promise<DataSource | null> {
  const embedded = readEmbedded(slot);
  if (embedded !== undefined) return inlineSource(embedded);
  if (host.POLARIS_DATA) return inlineSource(host.POLARIS_DATA);
  if (!host.claude?.use) return localSource();
  const db = await host.claude.use('db');
  return db ? artifactSource(db) : null;
}
