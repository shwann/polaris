import { describe, releaseText, importText, undoText } from '../audit.js';
import { required, write, type Context } from '../service/context.js';
import { changeTask } from '../service/tasks.js';
import { changeRequirement, checkRequirement } from '../service/requirements.js';
import { changeSystem } from '../service/systems.js';
import { recordRelease, setNextRelease } from '../service/releases.js';
import { undo } from '../service/undo.js';
import { setDispatch, taskDispatchPatch } from '../service/dispatch.js';
import { readLegacy, importSnapshot } from '../export/importer.js';
import { patch, string, multi, type Parsed } from './args.js';

const taskFields = [
  'code',
  'title',
  'lane',
  'status',
  'sort',
  'progress',
  'detail',
  'needs',
  'owner',
  'ref',
  'shipped-in',
  'target-release',
  'unverified',
  'executor',
];
const reqFields = ['title', 'body', 'source', 'priority', 'status', 'scope', 'owner'];
const appFields = [
  'version',
  'build',
  'released-at',
  'backend',
  'backend-label',
  'backend-build',
  'skill',
  'model',
  'next',
  'next-note',
  'ref',
];
export function executeWrite(ctx: Context, args: Parsed) {
  const [command, action, positionalId] = args.positionals;
  const id = string(args, 'id') || positionalId;
  const note = string(args, 'note');
  const title = string(args, 'title');
  let autoAccepted: string[] = [];
  let text: string,
    apply: () => unknown,
    preserveEvents = false;
  if (command === 'task') {
    const fields = action === 'step' ? ['name', 'state'] : taskFields;
    const values = patch(args, fields);
    const dispatch = string(args, 'dispatch');
    if (dispatch !== undefined) {
      if (action !== 'update') throw new Error('--dispatch 仅用于 task update');
      Object.assign(values, taskDispatchPatch(dispatch));
    }
    if (string(args, 'executor') !== undefined) {
      if (action !== 'update') throw new Error('--executor 仅用于 task update');
      values.executor_at = values.executor ? ctx.at : null;
    }
    // Task statuses are free text; requirement statuses alone use the closed enum.
    if (string(args, 'status') !== undefined) values.status = string(args, 'status')!;
    text = describe('task', action!, id || string(args, 'code') || title || '', {
      ...values,
      ...patch(args, ['req', 'seq']),
    });
    apply = () => {
      const result = changeTask(
        ctx,
        action!,
        id,
        values,
        string(args, 'req'),
        string(args, 'seq') === undefined ? undefined : Number(string(args, 'seq')),
      );
      autoAccepted = result.autoAccepted;
      return result.id;
    };
  } else if (command === 'dispatch') {
    text = `设置系统 ${ctx.config.system || 'beidou'} 派工：${string(args, 'engine') || ''}/${string(args, 'model') || ''}/${string(args, 'effort') || ''}${note === undefined ? '' : `，原话：${note}`}`;
    apply = () =>
      setDispatch(ctx, {
        engine: string(args, 'engine') ?? '',
        model: string(args, 'model') ?? '',
        effort: string(args, 'effort') ?? '',
        note: note ?? '',
        by: string(args, 'by') ?? '用户',
      });
  } else if (command === 'req' && action === 'check') {
    const key = required(id, '需求 ID');
    const item = Number(string(args, 'item'));
    text = `${args.values.off ? '取消满足' : '勾选'}需求 ${key} 第 ${item} 条验收标准`;
    apply = () => checkRequirement(ctx, key, item, !args.values.off);
  } else if (command === 'req') {
    text = describe('req', action!, id || title || '', {
      ...patch(args, reqFields),
      ...patch(args, ['task']),
      ...(multi(args, 'accept') ? { accept: multi(args, 'accept')!.join('；') } : {}),
      ...(multi(args, 'refs') ? { refs: multi(args, 'refs')!.join('；') } : {}),
    });
    apply = () => {
      const result = changeRequirement(
        ctx,
        action!,
        id,
        patch(args, reqFields),
        multi(args, 'accept'),
        multi(args, 'refs'),
        string(args, 'task'),
      );
      autoAccepted = result.autoAccepted;
      return result.id;
    };
  } else if (command === 'system') {
    text = describe(
      'system',
      action!,
      id || ctx.config.system || '',
      patch(args, ['constellation', 'name', 'note', 'sort']),
    );
    apply = () => changeSystem(ctx, action!, id, patch(args, ['constellation', 'name', 'note', 'sort']));
  } else if (command === 'release' && action === 'next') {
    text = `设置系统 ${ctx.config.system || ''} 下一版 ${string(args, 'version') || ''}${note === undefined ? '' : `：${note || '清空说明'}`}`;
    apply = () => setNextRelease(ctx, string(args, 'version'), note);
  } else if (command === 'release') {
    text = releaseText(ctx.config.system || '', string(args, 'version') || '', multi(args, 'tasks') || []);
    apply = () =>
      recordRelease(
        ctx,
        patch(args, appFields),
        (multi(args, 'tasks') ?? []).flatMap((v) => v.split(',')).filter(Boolean),
        note,
      );
  } else if (command === 'log') {
    text = required(string(args, 'text') || note || positionalId, '--text');
    apply = () => null;
  } else if (command === 'undo') {
    const batch = required(action, '批次 ID');
    text = undoText(batch);
    apply = () => undo(ctx, batch);
  } else if (command === 'import-json') {
    const data = readLegacy(required(action, '数据文件夹'), Boolean(args.values['artifact-export']), ctx.at);
    text = importText(data.tasks.length, data.events.length);
    apply = () => importSnapshot(ctx.db, data);
    preserveEvents = true;
  } else throw new Error(`未知写命令：${command}`);
  const eventContext =
    command === 'dispatch'
      ? { ...ctx, config: { ...ctx.config, system: ctx.config.system || 'beidou' } }
      : command === 'system'
        ? { ...ctx, config: { ...ctx.config, system: id || ctx.config.system } }
        : command === 'undo'
          ? { ...ctx, config: { ...ctx.config, system: undefined } }
          : ctx;
  const result = write(
    eventContext,
    command === 'dispatch' || (command === 'release' && action === 'next') ? text : note || text,
    apply,
    preserveEvents,
  );
  return {
    ...result,
    text: result.text + (autoAccepted.length ? `；需求 ${autoAccepted.join('、')} 自动转待验收` : ''),
  };
}
