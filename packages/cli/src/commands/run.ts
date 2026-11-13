import { join } from 'node:path';
import { config } from '../config.js';
import { connect, transaction } from '../db/connection.js';
import { snapshot } from '../export/snapshot.js';
import { backup, restore } from '../export/backup.js';
import { serve } from '../server.js';
import { mirror } from './mirror.js';
import { parse, string, type Parsed } from './args.js';
import { help } from './help.js';
import { status, statusText } from './status.js';
import { check } from './check.js';
import { executeWrite } from './write.js';
import { required } from '../service/context.js';
import { dispatchShow } from './dispatch.js';

const actions: Record<string, readonly string[]> = {
  system: ['add', 'update', 'list'],
  req: ['add', 'update', 'move', 'check', 'link', 'unlink', 'list', 'show'],
  task: ['add', 'update', 'move', 'step', 'link', 'list', 'show', 'delete'],
  release: ['record', 'next'],
  log: ['add'],
  dispatch: ['set', 'show'],
};
const singles = ['status', 'check', 'undo', 'backup', 'restore', 'serve', 'mirror', 'import-json'];
function validateCommand(args: Parsed): void {
  const [command = '', action] = args.positionals;
  if (actions[command]) {
    if (!action || !actions[command].includes(action))
      throw new Error(`无效操作：${command} ${action || ''}，请用 --help 查看用法`);
  } else if (!singles.includes(command)) throw new Error(`未知命令：${command}，请用 --help 查看用法`);
  const max =
    command === 'dispatch' ? 2 : actions[command] ? 3 : ['undo', 'restore', 'import-json'].includes(command) ? 2 : 1;
  if (args.positionals.length > max) throw new Error('位置参数过多，请用 --help 查看用法');
}
export async function run(argv: string[]): Promise<void> {
  const args = parse(argv),
    [command, action, id] = args.positionals;
  const output = (data: unknown, text: string) => console.log(args.values.json ? JSON.stringify(data) : text);
  if (args.values.help || !command) {
    output({ help }, help);
    return;
  }
  validateCommand(args);
  const cfg = config({ home: string(args, 'home'), actor: string(args, 'actor'), system: string(args, 'system') });
  if (command === 'dispatch' && action === 'show') {
    await dispatchShow(cfg, args);
    return;
  }
  if (command === 'restore') {
    const result = restore(required(action, 'SQL 文件'), cfg.path);
    const restored = connect(cfg.path);
    try {
      const saved = backup(restored, cfg.home, '恢复数据库');
      if (saved.warning) console.error(saved.warning);
      output({ ...result, ...saved }, `已恢复数据库，旧库保留在 ${result.retained || '（无旧库）'}`);
    } finally {
      restored.close();
    }
    return;
  }
  const db = connect(cfg.path);
  let serving = false;
  try {
    if (command === 'serve') {
      const result = await serve(db, Number(string(args, 'port') ?? 8790), undefined, {
        config: cfg,
        readonly: Boolean(args.values.readonly),
      });
      output(
        { port: result.port, alreadyRunning: result.alreadyRunning },
        `北辰本机看板${result.alreadyRunning ? '已经在运行' : ''}：http://127.0.0.1:${result.port}/`,
      );
      serving = !result.alreadyRunning;
      if (serving) {
        const stop = () =>
          result.server.close(() => {
            db.close();
            process.off('SIGINT', stop);
            process.off('SIGTERM', stop);
          });
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
      }
    } else if (command === 'status') {
      const result = status(
        transaction(db, () => snapshot(db)),
        cfg.system,
      );
      output(result, statusText(result));
    } else if (command === 'check') {
      const result = transaction(db, () => check(db));
      output(
        result,
        `${result.tasks} 项任务，${result.errors} 个错误，${result.warnings} 个提示${result.issues.length ? '\n' + result.issues.map((i) => `${i.path}：${i.message}`).join('\n') : ''}`,
      );
      if (result.errors) process.exitCode = 1;
    } else if (command === 'mirror') {
      const out = mirror(
        transaction(db, () => snapshot(db)),
        string(args, 'out') || join(cfg.home, 'build', 'mirror.html'),
      );
      output({ out }, `已生成镜像：${out}`);
    } else if (command === 'backup') {
      const result = backup(db, cfg.home, string(args, 'note') || '手动备份');
      output(result, `已导出：${result.file}`);
      if (result.warning) console.error(result.warning);
    } else if (action === 'list' || action === 'show') {
      const data = transaction(db, () => snapshot(db));
      const items = command === 'system' ? data.systems : command === 'req' ? data.requirements : data.tasks;
      const filtered = items.filter(
        (item) => !cfg.system || ('systemKey' in item ? item.systemKey === cfg.system : item.key === cfg.system),
      );
      const key = string(args, 'id') || id;
      const result =
        action === 'show'
          ? filtered.find((item) => ('id' in item ? item.id : item.key) === required(key, 'ID'))
          : filtered;
      if (!result) throw new Error(`找不到：${key}`);
      output(
        result,
        Array.isArray(result)
          ? result
              .map((item) => `${'id' in item ? item.id : item.key} ${'title' in item ? item.title : item.name}`)
              .join('\n') || '暂无记录'
          : JSON.stringify(result, null, 2),
      );
    } else {
      const result = executeWrite({ db, config: cfg, at: new Date().toISOString() }, args);
      let saved: ReturnType<typeof backup> | undefined;
      try {
        saved = backup(db, cfg.home, result.text);
      } catch {
        console.error('业务数据已提交，但 SQL 备份失败，请运行 backup 重试');
      }
      if (saved?.warning) console.error(saved.warning);
      output({ ...result, backup: saved }, `已完成：${result.text}（批次 ${result.batch}）`);
    }
  } finally {
    if (!serving) db.close();
  }
}
