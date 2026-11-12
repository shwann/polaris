import type { Task } from '../domain/types';

/** Only the sky presentation disambiguates codes, independently for each system. */
export function skyNames(tasks: Task[]) {
  const counts = new Map<string, number>();
  const key = (t: Task) => JSON.stringify([t.systemKey, t.code]);
  for (const t of tasks) counts.set(key(t), (counts.get(key(t)) || 0) + 1);
  return new Map(tasks.map((t) => [t.id, counts.get(key(t))! > 1 ? t.id : t.code]));
}
