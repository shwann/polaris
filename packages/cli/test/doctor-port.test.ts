import { EventEmitter } from 'node:events';
import { afterEach, expect, test, vi } from 'vitest';
import { inspectPort } from '../src/commands/doctor-port.js';

const state = vi.hoisted(() => ({ error: '', polaris: false, malformed: false, timeout: false }));
vi.mock('node:net', () => ({
  createServer: () => {
    const server = new EventEmitter() as EventEmitter & {
      listen: (_port: number, _host: string, ready: () => void) => void;
      close: (done: () => void) => void;
    };
    server.listen = (_port, _host, ready) => {
      queueMicrotask(() =>
        state.error ? server.emit('error', Object.assign(new Error(state.error), { code: state.error })) : ready(),
      );
    };
    server.close = (done) => done();
    return server;
  },
}));
vi.mock('node:http', () => ({
  get: (_url: string, handle: (res: EventEmitter) => void) => {
    const req = new EventEmitter() as EventEmitter & { destroy: () => void };
    req.destroy = () => {
      req.emit('close');
    };
    queueMicrotask(() => {
      if (state.timeout) return;
      const res = Object.assign(new EventEmitter(), {
        statusCode: 200,
        headers: { 'x-polaris': state.polaris ? '1' : undefined },
        setEncoding: () => {},
      });
      handle(res);
      res.emit(
        'data',
        state.malformed
          ? 'not JSON'
          : JSON.stringify({ schema: 1, systems: [], tasks: [], requirements: [], events: [] }),
      );
      res.emit('end');
      req.emit('close');
    });
    return req;
  },
}));
afterEach(() => {
  Object.assign(state, { error: '', polaris: false, malformed: false, timeout: false });
  vi.useRealTimers();
});

test('free port is healthy', async () => {
  expect(await inspectPort()).toMatchObject({ ok: true, occupied: false, polaris: false });
});
test('recognizes Polaris using its response header and snapshot structure', async () => {
  Object.assign(state, { error: 'EADDRINUSE', polaris: true });
  expect(await inspectPort()).toMatchObject({ ok: true, occupied: true, polaris: true });
});
test('foreign or malformed HTTP servers fail with an alternate-port suggestion', async () => {
  state.error = 'EADDRINUSE';
  expect(await inspectPort()).toMatchObject({ ok: false, occupied: true, polaris: false });
  state.polaris = true;
  state.malformed = true;
  expect((await inspectPort()).detail).toContain('serve --port 8791');
});
test('socket permission failures become diagnostics', async () => {
  state.error = 'EPERM';
  expect(await inspectPort()).toMatchObject({ ok: false, occupied: false, polaris: false });
});
test('unresponsive ports time out instead of hanging doctor', async () => {
  vi.useFakeTimers();
  Object.assign(state, { error: 'EADDRINUSE', timeout: true });
  const result = inspectPort();
  await vi.advanceTimersByTimeAsync(1001);
  expect(await result).toMatchObject({ ok: false, occupied: true, polaris: false });
});
