import type { DisplaySnapshot } from '../domain/types';
export type Origin = 'mirror' | 'local' | 'db';
export interface SourceUpdate {
  snapshot: DisplaySnapshot;
  confirmed: boolean;
}
export interface DataSource {
  kind: Origin;
  label: string;
  subscribe(onData: (update: SourceUpdate) => void, onError: (error: unknown) => void): () => void;
}
export interface ArtifactSnapshot {
  metadata?: { fromCache?: boolean };
  exists?: boolean;
  docs?: { id: string; data(): Record<string, unknown> }[];
  data(): Record<string, unknown>;
}
export interface ArtifactRef {
  onSnapshot(data: (s: ArtifactSnapshot) => void, error: (e: unknown) => void): (() => void) | void;
}
export interface ArtifactDatabase {
  collection(path: string): ArtifactRef;
  doc(path: string): ArtifactRef;
}
export interface SourceHost {
  POLARIS_DATA?: unknown;
  claude?: { use(name: 'db'): Promise<ArtifactDatabase | null> };
}
declare global {
  interface Window {
    POLARIS_DATA?: SourceHost['POLARIS_DATA'];
    claude?: SourceHost['claude'];
  }
}
