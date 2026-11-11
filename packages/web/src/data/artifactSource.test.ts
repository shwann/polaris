import { it, expect, vi } from 'vitest';
import { artifactSource } from './artifactSource';
import type { ArtifactSnapshot } from './DataSource';
import { legacySample } from '../../tests/fixtures/sample';
it('resends an unchanged Artifact snapshot after link loss and ignores late callbacks after unsubscribe', () => {
  const data = new Map<string, (s: ArtifactSnapshot) => void>(),
    errors = new Map<string, (e: unknown) => void>(),
    off = vi.fn();
  const ref = (p: string) => ({
    onSnapshot: (cb: (s: ArtifactSnapshot) => void, fail: (e: unknown) => void) => {
      data.set(p, cb);
      errors.set(p, fail);
      return off;
    },
  });
  const emit = vi.fn(),
    fail = vi.fn(),
    close = artifactSource({ collection: ref, doc: ref }).subscribe(emit, fail);
  const tasks = { data: () => ({}), docs: legacySample.tasks.map((t) => ({ id: t.id, data: () => t })) };
  data.get('tasks')!(tasks);
  data.get('meta/board')!({ exists: true, data: () => legacySample.board });
  data.get('meta/log')!({ exists: true, data: () => legacySample.log });
  expect(emit).toHaveBeenCalledOnce();
  data.get('tasks')!(tasks);
  expect(emit).toHaveBeenCalledOnce();
  errors.get('tasks')!({ code: 'offline' });
  expect(fail).toHaveBeenCalledOnce();
  data.get('tasks')!(tasks);
  expect(emit).toHaveBeenCalledTimes(2);
  close();
  data.get('tasks')!(tasks);
  errors.get('tasks')!('late');
  expect(emit).toHaveBeenCalledTimes(2);
  expect(fail).toHaveBeenCalledOnce();
  expect(off).toHaveBeenCalledTimes(3);
});
