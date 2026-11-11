import styles from './Shared.module.css';
import { cn } from '../../styles/cn';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { vars } from '../../styles/style';
import { useCountUp } from '../../hooks/useCountUp';
const opened = new Set<string>();
export function Count({ id, value }: { id: string; value: number }) {
  return <span ref={useCountUp(id, value)}>{value}</span>;
}
export function Clamp({
  className,
  text,
  id,
  lines = 2,
}: {
  className?: string;
  text: string;
  id: string;
  lines?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null),
    [open, setOpen] = useState(() => opened.has(id)),
    [cut, setCut] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setCut(open || node.scrollHeight > node.clientHeight + 1);
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(node);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [text, open]);
  const toggle = () => {
    const next = !open;
    if (next) opened.add(id);
    else opened.delete(id);
    setOpen(next);
  };
  return (
    <>
      <p
        ref={ref}
        data-clamp
        className={cn(className, styles.clamp, open && styles.open, cut && styles.cut)}
        style={vars({ '--lines': lines })}
        onClick={() => {
          if (cut && !getSelection()?.toString()) toggle();
        }}
      >
        {text}
      </p>
      {cut && (
        <button type="button" className={styles.more} onClick={toggle}>
          {open ? '收起 ▴' : '展开 ▾'}
        </button>
      )}
    </>
  );
}
export function RefLine({ parts, reference }: { parts: (string | undefined)[]; reference?: string }) {
  const ref = useRef<HTMLDivElement>(null),
    [copied, setCopied] = useState(''),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    text = parts.filter(Boolean).join(' · '),
    path = reference?.match(/docs\/[^\s·，,;；]+/)?.[0];
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!text) return null;
  return (
    <div className={styles.ref} ref={ref}>
      {text}
      {path && (
        <button
          type="button"
          className={cn(styles.copy, copied === '已复制' && styles.ok)}
          title={path}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(path);
              setCopied('已复制');
            } catch {
              const node = ref.current?.firstChild;
              if (node) {
                const r = document.createRange();
                r.selectNodeContents(node);
                const s = getSelection();
                s?.removeAllRanges();
                s?.addRange(r);
              }
              setCopied('已选中，按 ⌘C');
            }
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(''), 1800);
          }}
        >
          {copied || '复制路径'}
        </button>
      )}
    </div>
  );
}
export function Needs({ text, className }: { text?: string; className?: string }) {
  return text ? (
    <p className={cn(styles.needs, className)}>
      <b>需要你：</b>
      {text}
    </p>
  ) : null;
}
export function Button({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button className={styles.btn} type="button" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}
