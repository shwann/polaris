import { useEffect, useState } from 'react';
import { setProjection, uiStore } from '../store/uiStore';
export function useFullscreen() {
  const [label, setLabel] = useState('⛶ 投屏全屏');
  useEffect(() => {
    let before = false;
    const changed = () => {
      if (document.fullscreenElement) {
        before = uiStore.getState().projection;
        setProjection(true);
      } else setProjection(before);
      setLabel(document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 投屏全屏');
    };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  return {
    label,
    toggle: async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        setLabel('此处不支持全屏');
      }
    },
  };
}
