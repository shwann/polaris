import { existsSync } from 'node:fs';
import { dispatchDate, dispatchLabel, type DispatchSetting } from '@polaris/core';
import type { Config } from '../config.js';
import { readOnly } from '../db/readonly.js';
import { showDispatch } from '../service/dispatch.js';
import { string, type Parsed } from './args.js';

export async function dispatchShow(cfg: Config, args: Parsed): Promise<void> {
  if (!existsSync(cfg.path)) throw new Error('尚未设置派工，请先运行 dispatch set');
  const result = await readOnly(cfg.path, (db) =>
    showDispatch(db, cfg.system, string(args, 'task'), Boolean(args.values.history)),
  );
  const text = (d: DispatchSetting) =>
    `派工：${dispatchLabel(d)}（${dispatchDate(d.setAt, true)} ${d.by}定）${d.task ? ` 来源：${d.source === 'task' ? '任务覆盖' : '系统设置'}（${d.task}）` : ''}原话：${d.note}`.replace(
      /[\r\n\u2028\u2029]+/g,
      ' ',
    );
  console.log(
    args.values.json
      ? JSON.stringify(result)
      : 'current' in result
        ? `${text(result.current)}；历史：${result.history.map(text).join('；')}`
        : text(result),
  );
}
