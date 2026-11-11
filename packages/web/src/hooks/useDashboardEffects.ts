import { useEffect } from 'react';
import { uiStore } from '../store/uiStore';
import { dataStore } from '../store/dataStore';
import { selectView } from '../domain/selectors';
import { laneInfo } from '../domain/lanes';
export function useDashboardEffects() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const panel = target.closest<HTMLElement>('.hud');
      if (panel) {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty('--mx', e.clientX - r.left + 'px');
        panel.style.setProperty('--my', e.clientY - r.top + 'px');
      }
    };
    document.addEventListener('pointermove', move, { passive: true });
    let old = uiStore.getState();
    const off = uiStore.subscribe((next) => {
      if (next.sky && !old.sky) document.getElementById('skyback')?.focus();
      if (((old.selected && !next.selected) || (old.dip >= 0 && next.dip < 0)) && next.sky) {
        const active = document.activeElement;
        if (active?.closest('#starcard,#dipcard')) document.getElementById('skyback')?.focus();
      }
      if (next.system !== old.system || next.query !== old.query || next.mineOnly !== old.mineOnly)
        dataStore.setState({ changed: new Set() });
      const sr = document.getElementById('sr'),
        v = selectView(dataStore.getState().snapshot, next.system),
        t = v.tasks.find((t) => t.id === next.selected);
      if (sr && t)
        sr.textContent = `${t.code} ${t.title}，${laneInfo(t.lane).name}${t.status ? '，' + t.status : ''}${t.needs ? '，需要你：' + t.needs : ''}`;
      old = next;
    });
    return () => {
      off();
      document.removeEventListener('pointermove', move);
    };
  }, []);
}
