import type { Task } from '../domain/types';

/** Only the sky presentation disambiguates codes, independently for each system. */
export function skyNames(tasks: Task[]) {
  const counts = new Map<string, number>();
  const key = (t: Task) => JSON.stringify([t.systemKey, t.code]);
  for (const t of tasks) counts.set(key(t), (counts.get(key(t)) || 0) + 1);
  return new Map(tasks.map((t) => [t.id, counts.get(key(t))! > 1 ? t.id : t.code]));
}

/** Characters that end a title's lead-in, such as the colon in "AI 专家：报价单读入". */
const LEAD_END = /[：:，,、；;|｜/\s—-]/;

/**
 * Short sky labels drop a lead-in a title shares with another title of the same group, so three "AI 专家：…" stars
 * do not all read "AI 专…". The lead-in must end at punctuation or a space and leave some title behind.
 */
export function clusterTitles(tasks: Pick<Task, 'id' | 'lane' | 'title'>[]) {
  const byLane = new Map<string, string[]>();
  for (const t of tasks) (byLane.get(t.lane) || byLane.set(t.lane, []).get(t.lane)!).push(t.title.trim());
  return new Map(
    tasks.map((t) => {
      const title = t.title.trim(),
        others = byLane.get(t.lane)!;
      let cut = 0;
      for (let i = 1; i < title.length - 1; i++) {
        if (!LEAD_END.test(title[i]!)) continue;
        const lead = title.slice(0, i + 1);
        if (lead.trim().length < 2 || !title.slice(i + 1).trim()) continue;
        if (others.filter((o) => o.startsWith(lead)).length > 1) cut = i + 1;
      }
      return [t.id, title.slice(cut).trim()];
    }),
  );
}
