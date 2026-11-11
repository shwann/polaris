import '../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useFullscreen } from './useFullscreen';
import { useWakeLock } from './useWakeLock';
import { uiStore } from '../store/uiStore';
function Projection() {
  const full = useFullscreen();
  useWakeLock();
  return <button onClick={full.toggle}>{full.label}</button>;
}
it('remembers projection before fullscreen, requests a wake lock and releases it on exit', async () => {
  let full = false;
  const release = vi.fn().mockResolvedValue(undefined),
    request = vi.fn().mockResolvedValue({ release });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => (full ? document.documentElement : null),
  });
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: async () => {
      full = true;
      document.dispatchEvent(new Event('fullscreenchange'));
    },
  });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: async () => {
      full = false;
      document.dispatchEvent(new Event('fullscreenchange'));
    },
  });
  const { unmount } = render(<Projection />);
  await act(() => fireEvent.click(screen.getByRole('button')));
  expect(uiStore.getState().projection).toBe(true);
  expect(request).toHaveBeenCalledWith('screen');
  expect(screen.getByText('⛶ 退出全屏')).toBeTruthy();
  await act(() => fireEvent.click(screen.getByRole('button')));
  expect(release).toHaveBeenCalledOnce();
  expect(uiStore.getState().projection).toBe(false);
  unmount();
  Reflect.deleteProperty(document, 'fullscreenElement');
});
