import { useEffect } from 'react';
import { uiStore, viewFromHash } from '../store/uiStore';

export function useViewHash() {
  useEffect(() => {
    const sync = () => uiStore.setState({ view: viewFromHash() });
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
}
