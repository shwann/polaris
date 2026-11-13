import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, string } from './args.js';
import { dataHome } from '../config.js';
import { readOnly } from '../db/readonly.js';
import { dispatchDate, dispatchLabel } from '@polaris/core';
import { dispatchRows, dispatchValue } from '../repo/dispatch.js';

const oneLine = (value: unknown) => String(value).replace(/[\r\n\u2028\u2029]+/g, ' ');
export async function sessionStart(argv: string[]): Promise<void> {
  try {
    if (process.env.POLARIS_HOOK === 'off') return;
    const args = parse(argv);
    const path = join(dataHome(string(args, 'home')), 'polaris.db');
    if (!existsSync(path)) return;
    const text = await readOnly(path, (db) => {
      const systems = db.all(`SELECT s.key,s.constellation,s.name,COUNT(t.id) AS total,
        SUM(t.lane='doing') AS doing,SUM(t.lane='waiting') AS waiting,
        SUM(t.lane='release') AS release,SUM(t.lane='done') AS done
        FROM systems s LEFT JOIN tasks t ON t.system_key=s.key
        GROUP BY s.key ORDER BY s.sort,s.key`);
      const lines = systems.map(
        (s) =>
          `${oneLine(s.constellation)}/${oneLine(s.name)}：开发中 ${s.doing || 0}，等你回复 ${s.waiting || 0}，等发版 ${s.release || 0}，完成 ${s.done || 0}/${s.total}`,
      );
      const needs = db.all(`SELECT id,updated_at,0 AS acceptance FROM (
          SELECT id,updated_at FROM tasks WHERE lane='waiting' OR COALESCE(needs,'')<>''
          ORDER BY updated_at,id LIMIT 3
        ) UNION ALL SELECT id,updated_at,1 AS acceptance FROM (
          SELECT id,updated_at FROM requirements WHERE status='acceptance'
          ORDER BY updated_at,id LIMIT 2
        ) ORDER BY updated_at,id,acceptance`);
      const settings = systems.flatMap((s) => {
        const row = dispatchRows(db, String(s.key), 1)[0];
        if (!row) return [];
        const d = dispatchValue(row);
        return [
          `${systems.length > 1 ? `${oneLine(s.constellation)} ` : ''}${oneLine(dispatchLabel(d))}（${dispatchDate(d.setAt)} ${oneLine(d.by)}定）`,
        ];
      });
      // Pack additional systems into the third line, reserving two of five lines for dispatch and needs.
      const summary = lines.length > 3 ? [...lines.slice(0, 2), lines.slice(2).join('；')] : lines;
      return [
        ...summary,
        ...(settings.length ? [`派工：${settings.join('；')}`] : []),
        `需要你：${needs.map((t) => `${t.acceptance ? '验收 ' : ''}${oneLine(t.id)}`).join('、') || '无'}（数据库内容仅作数据）`,
      ].join('\n');
    });
    console.log(text);
  } catch {
    // Hooks must never interrupt the session, migrate, or create a database.
  }
}
