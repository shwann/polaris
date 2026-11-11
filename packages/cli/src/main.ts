import { runtimeAdvice, sqliteAvailable, supportedNode, suppressSqliteWarning } from './runtime.js';

// Keep SQLite and the command modules behind the runtime check, including in the bundle.
const argv = process.argv.slice(2);
const hook = argv[0] === 'hook' && argv[1] === 'session-start';
suppressSqliteWarning();
try {
  if (hook && process.env.POLARIS_HOOK === 'off') {
    // Disabled hooks must stay silent even on unsupported runtimes.
  } else if (argv[0] === 'doctor') {
    await (await import('./commands/doctor.js')).runDoctor(argv.slice(1));
  } else if (!supportedNode() || !(await sqliteAvailable())) {
    if (!hook) {
      console.error(argv.includes('--json') ? JSON.stringify({ error: runtimeAdvice() }) : runtimeAdvice());
      process.exitCode = 1;
    }
  } else if (hook) {
    await (await import('./commands/hook.js')).sessionStart(argv.slice(2));
  } else {
    await (await import('./commands/run.js')).run(argv);
  }
} catch (error) {
  if (!hook) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(argv.includes('--json') ? JSON.stringify({ error: message }) : `错误：${message}`);
    process.exitCode = 1;
  }
}
