import { runtimeAdvice, sqliteAvailable, supportedNode, suppressSqliteWarning } from './runtime.js';

// Keep SQLite and the command modules behind the runtime check, including in the bundle.
const argv = process.argv.slice(2);
// Global options may precede a command, including the runtime-safe hook and doctor entry points.
let commandIndex = 0;
while (commandIndex < argv.length) {
  const arg = argv[commandIndex]!;
  if (['--home', '--actor', '--system'].includes(arg)) commandIndex += 2;
  else if (/^--(home|actor|system)=/.test(arg) || arg === '--json') commandIndex++;
  else break;
}
const hook = argv[commandIndex] === 'hook' && argv[commandIndex + 1] === 'session-start';
suppressSqliteWarning();
try {
  if (hook && process.env.POLARIS_HOOK === 'off') {
    // Disabled hooks must stay silent even on unsupported runtimes.
  } else if (argv[commandIndex] === 'doctor') {
    await (
      await import('./commands/doctor.js')
    ).runDoctor([...argv.slice(0, commandIndex), ...argv.slice(commandIndex + 1)]);
  } else if (!supportedNode() || !(await sqliteAvailable())) {
    if (!hook) {
      console.error(argv.includes('--json') ? JSON.stringify({ error: runtimeAdvice() }) : runtimeAdvice());
      process.exitCode = 1;
    }
  } else if (hook) {
    await (
      await import('./commands/hook.js')
    ).sessionStart([...argv.slice(0, commandIndex), ...argv.slice(commandIndex + 2)]);
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
