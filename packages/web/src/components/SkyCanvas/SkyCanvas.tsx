import styles from './SkyCanvas.module.css';
import { cn } from '../../styles/cn';
import { useEffect, useRef, useState } from 'react';
import { SkyEngine } from '../../sky/SkyEngine';
import { layoutRegistry } from '../../layout/LayoutRegistry';
import { attachEngine, selectFromSky } from '../../hooks/skyBridge';
import { openDip } from '../../store/uiStore';
import { bindTooltip, showTooltip } from './tooltipBridge';
import { moveStarCard } from '../StarCard/StarCard';

export function SkyCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null),
    tooltip = useRef<HTMLDivElement>(null),
    [dim, setDim] = useState(false);
  useEffect(() => {
    // Dim the sky behind the content once the title area (above the system tabs) has scrolled away.
    let frame = 0;
    const check = () => {
      frame = 0;
      const tabs = document.querySelector('[role="tablist"]');
      setDim(!!tabs && tabs.getBoundingClientRect().top < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    bindTooltip((text, detail, x, y) => {
      const tip = tooltip.current;
      if (!tip) return;
      tip.hidden = !text;
      if (!text) return;
      tip.replaceChildren(document.createTextNode(text));
      // Each detail line (group hint, then the star's requirement or module) gets its own row.
      for (const line of detail.split('\n')) {
        const small = document.createElement('small');
        small.textContent = line;
        tip.append(small);
      }
      tip.className = cn(styles.tip, !!text && styles.on);
      tip.style.left = Math.min(x + 14, innerWidth - tip.offsetWidth - 8) + 'px';
      tip.style.top = y + 18 + 'px';
    });
    const engine = new SkyEngine(canvas.current!, layoutRegistry, {
      onPickStar: selectFromSky,
      onPickDipper: (k) => openDip(k, true),
      onSelectedMove: moveStarCard,
      onTooltip: showTooltip,
      onCursor: (cursor) => {
        document.body.style.cursor = cursor;
      },
      isBlocked: (target, wheel) =>
        target instanceof Element &&
        !!target.closest(wheel ? '#skybar,#skylegend,#starcard,#dipcard' : '[data-sky-block],button,input,a,summary'),
    });
    attachEngine(engine);
    return () => {
      attachEngine(null);
      bindTooltip(null);
      engine.destroy();
      document.body.style.cursor = '';
    };
  }, []);
  return (
    <>
      <canvas className={cn(styles.field, dim && styles.dim)} ref={canvas} aria-hidden="true" />
      <div className={styles.tip} ref={tooltip} hidden aria-hidden="true" />
    </>
  );
}
