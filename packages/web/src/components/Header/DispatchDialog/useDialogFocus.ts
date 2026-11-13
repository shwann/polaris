import { useEffect, useRef } from 'react';
import { dataStore } from '../../../store/dataStore';

export function useDialogFocus(onClose: () => void) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input:checked')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!dataStore.getState().writing) onClose();
      } else if (event.key === 'Tab') {
        const controls = ref.current?.querySelectorAll<HTMLElement>(
          'input:not([type="radio"]):not(:disabled), input[type="radio"]:checked:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)',
        );
        if (!controls?.length) {
          event.preventDefault();
          return;
        }
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [onClose]);
  return ref;
}
