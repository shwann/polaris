import { useEffect, useRef, useState } from 'react';
import { uiStore } from '../store/uiStore';
export function useSearch() {
  const [draft, setDraft] = useState(() => uiStore.getState().query),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    own = useRef(false);
  useEffect(() => {
    const off = uiStore.subscribe((next, previous) => {
      if (next.query !== previous.query && !own.current) {
        clearTimeout(timer.current);
        setDraft(next.query);
      }
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, []);
  return {
    draft,
    change: (value: string) => {
      setDraft(value);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        own.current = true;
        uiStore.setState({ query: value.trim() });
        own.current = false;
      }, 150);
    },
  };
}
