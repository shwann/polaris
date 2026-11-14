import type { WaitingOn } from '@polaris/core';
import styles from './Shared.module.css';
import { cn } from '../../styles/cn';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { vars } from '../../styles/style';
import { useCountUp } from '../../hooks/useCountUp';
const opened = new Set<string>();
export function SectionHeading({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 {...props} className={cn(styles['section-heading'], className)} />;
}
export function Count({ id, value }: { id: string; value: number }) {
  return <span ref={useCountUp(id, value)}>{value}</span>;
}
export function Clamp({
  className,
  text,
  id,
  lines = 2,
  extra,
}: {
  className?: string;
  text: string;
  id: string;
  lines?: number;
  /** Text revealed only when expanded, e.g. a status chip that was cut to one line. */
  extra?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null),
    [open, setOpen] = useState(() => opened.has(id)),
    [overflow, setCut] = useState(false),
    cut = overflow || !!extra;
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
    <div className={cn(styles['clamp-box'], cut && !open && styles.folded)}>
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
        {open && extra && <span className={styles.extra}>{extra}</span>}
      </p>
      {cut && (
        <button type="button" className={styles.more} onClick={toggle}>
          {open ? '收起 ▴' : '展开 ▾'}
        </button>
      )}
    </div>
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
    <div className={styles.ref} ref={ref} title={text}>
      <span className={styles['ref-text']}>{text}</span>
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
const NEEDS_LABELS: Record<WaitingOn, string> = { user: '需要你：', customer: '等客户：', dependency: '等前置：' };
/** The ask line; its label follows who the task waits on (需要你 / 等客户 / 等前置). */
export function Needs({ text, className, wait }: { text?: string; className?: string; wait?: WaitingOn }) {
  return text ? (
    <p className={cn(styles.needs, className)} data-wait={wait}>
      <b>{NEEDS_LABELS[wait ?? 'user']}</b>
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
