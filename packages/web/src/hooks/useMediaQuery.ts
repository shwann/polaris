import { useSyncExternalStore } from 'react';
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const m = matchMedia(query);
      m.addEventListener('change', notify);
      return () => m.removeEventListener('change', notify);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
