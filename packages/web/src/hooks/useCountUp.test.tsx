import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './useCountUp';

function Probe({ id, to }: { id: string; to: number }) {
  return <span ref={useCountUp(id, to)}>{to}</span>;
}

describe('useCountUp', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lands on the final number even when animation frames never run', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const { container } = render(<Probe id="hidden-pane" to={12} />);
    expect(container.textContent).toBe('0');
    act(() => vi.advanceTimersByTime(1200));
    expect(container.textContent).toBe('12');
  });
});
