import { useEffect } from 'react';
import { escapeLayer, setSky, uiStore } from '../store/uiStore';
import { getEngine, stepStar } from './skyBridge';
export function useKeyboard() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea,select')) return;
      const s = uiStore.getState();
      if (e.key === 'Escape') escapeLayer();
      else if (s.sky && (e.key === '+' || e.key === '=')) getEngine()?.zoom(1.35);
      else if (s.sky && (e.key === '-' || e.key === '_')) getEngine()?.zoom(1 / 1.35);
      else if (s.sky && e.key === '0') getEngine()?.resetView();
      else if (s.sky && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        stepStar(['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1);
      } else if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !e.altKey) setSky(!s.sky);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
}
