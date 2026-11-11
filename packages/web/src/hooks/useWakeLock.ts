import { useEffect } from 'react';
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null,
      active = true;
    const sync = async () => {
      if (!document.fullscreenElement) {
        void lock?.release().catch(() => {});
        lock = null;
        return;
      }
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await navigator.wakeLock?.request('screen');
        if (!active) void next?.release();
        else lock = next || null;
      } catch {
        lock = null;
      }
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      active = false;
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('visibilitychange', sync);
      void lock?.release().catch(() => {});
    };
  }, []);
}
