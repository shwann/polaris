import type { ArtifactDatabase, DataSource } from './DataSource';
import type { LegacyTask, LegacyBoard, LegacyLog } from '@polaris/core';
import { normalize } from './normalize';
export function artifactSource(db: ArtifactDatabase): DataSource {
  return {
    kind: 'db',
    label: 'LIVE · 实时',
    subscribe(onData, onError) {
      const raw: { tasks: LegacyTask[]; board?: LegacyBoard; log?: LegacyLog } = { tasks: [] };
      const ready = new Set<string>(),
        confirmed = new Set<string>();
      let active = true,
        last = '';
      const fail = (e: unknown) => {
        if (active) {
          last = '';
          onError(e);
        }
      };
      const emit = (path: string, fromCache = false) => {
        if (!active) return;
        ready.add(path);
        if (!fromCache) confirmed.add(path);
        if (ready.size < 3) return;
        const signature = JSON.stringify([raw, confirmed.size === 3]);
        if (last === signature) return;
        last = signature;
        try {
          onData({ snapshot: normalize(raw), confirmed: confirmed.size === 3 });
        } catch (e) {
          onError(e);
        }
      };
      const subscriptions = [
        db.collection('tasks').onSnapshot((s) => {
          raw.tasks = (s.docs || []).map((d) => ({ id: d.id, ...d.data() }));
          emit('tasks', s.metadata?.fromCache);
        }, fail),
        db.doc('meta/board').onSnapshot((s) => {
          raw.board = s.exists ? (s.data() as LegacyBoard) : undefined;
          emit('board', s.metadata?.fromCache);
        }, fail),
        db.doc('meta/log').onSnapshot((s) => {
          raw.log = s.exists ? (s.data() as LegacyLog) : undefined;
          emit('log', s.metadata?.fromCache);
        }, fail),
      ];
      return () => {
        active = false;
        subscriptions.forEach((off) => off?.());
      };
    },
  };
}
