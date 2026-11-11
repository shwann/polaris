import { afterEach, expect, it, vi } from 'vitest';
import { localSource } from './localSource';
import { localWrite } from './localWrite';
import { sample } from '../../tests/fixtures/sample';

afterEach(() => {
  vi.useRealTimers();
});
it('discards polls begun before a write and pauses polling during a write', async () => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  let resolvePoll!: (value: Response) => void;
  let resolveWrite!: (value: Response) => void;
  const poller = vi
    .fn()
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolvePoll = resolve;
      }),
    )
    .mockResolvedValue(new Response(JSON.stringify(sample)));
  const emit = vi.fn(),
    off = localSource(poller).subscribe(emit, vi.fn());
  const write = localWrite(
    { token: 'a', page: 'b' },
    '/api/task/progress',
    { id: 'T', progress: 10 },
    vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveWrite = resolve;
      }),
    ),
  );
  resolvePoll(new Response(JSON.stringify(sample)));
  await vi.advanceTimersByTimeAsync(3000);
  expect(emit).not.toHaveBeenCalled();
  expect(poller).toHaveBeenCalledTimes(1);
  resolveWrite(new Response(JSON.stringify({ ok: true, batch: 'B', snapshot: sample })));
  await write;
  await vi.advanceTimersByTimeAsync(3000);
  expect(emit).toHaveBeenCalledOnce();
  off();
});
it('turns transport errors into Chinese messages and preserves backend errors', async () => {
  const args = [{ token: 'a', page: 'b' }, '/api/task/progress', {}] as const;
  await expect(localWrite(...args, vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow(
    '连接本机看板失败',
  );
  await expect(
    localWrite(
      ...args,
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: '找不到任务' }), { status: 400 })),
    ),
  ).rejects.toThrow('找不到任务');
});
