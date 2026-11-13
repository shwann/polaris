import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import {
  DISPATCH_EFFORTS,
  DISPATCH_EFFORT_LABELS,
  DISPATCH_ENGINE_LABELS,
  type DispatchEngine,
  type SystemInfo,
} from '@polaris/core';
import { dataStore, submitWrite } from '../../../store/dataStore';
import { DISPATCH_DEFAULTS, dispatchModels } from './models';
import { useDialogFocus } from './useDialogFocus';
import styles from './DispatchDialog.module.css';

export function DispatchDialog({ system, onClose }: { system: SystemInfo; onClose: () => void }) {
  const current = system.dispatch?.current;
  const [spec, setSpec] = useState(current ?? DISPATCH_DEFAULTS.codex);
  const [custom, setCustom] = useState(false);
  const [note, setNote] = useState('');
  const writing = useStore(dataStore, (s) => s.writing);
  const titleId = useId(),
    engineName = useId();
  const ref = useDialogFocus(onClose);
  const model = spec.model.trim();
  const unchanged = current?.engine === spec.engine && current.model === model && current.effort === spec.effort;
  const switchEngine = (engine: DispatchEngine) => {
    setSpec(current?.engine === engine ? current : DISPATCH_DEFAULTS[engine]);
    setCustom(false);
  };
  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !writing) onClose();
      }}
    >
      <form
        ref={ref}
        className={`${styles.dialog} hud`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={writing}
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (writing || !model || (unchanged && !note.trim())) return;
          const body = { system: system.key, engine: spec.engine, model, effort: spec.effort, note: note.trim() };
          if (
            await submitWrite(
              '/api/dispatch/set',
              body,
              `派工 ${DISPATCH_ENGINE_LABELS[spec.engine]} ${model} / ${spec.effort}`,
            )
          )
            onClose();
        }}
      >
        <h2 id={titleId}>{system.constellation} 派工设置</h2>
        <fieldset className={styles.fields} disabled={writing}>
          <fieldset className={styles.engines}>
            <legend>执行方</legend>
            {(['codex', 'claude'] as const).map((engine) => (
              <label key={engine}>
                <input
                  type="radio"
                  name={engineName}
                  value={engine}
                  checked={spec.engine === engine}
                  onChange={() => switchEngine(engine)}
                />
                {DISPATCH_ENGINE_LABELS[engine]}
              </label>
            ))}
          </fieldset>
          <label className={styles.field}>
            模型
            <select
              value={custom ? '' : spec.model}
              onChange={(e) => {
                setCustom(!e.target.value);
                setSpec({ ...spec, model: e.target.value });
              }}
            >
              {dispatchModels(system, spec.engine).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
              <option value="">其他…</option>
            </select>
          </label>
          {custom && (
            <label className={styles.field}>
              自定义模型
              <input
                type="text"
                value={spec.model}
                maxLength={64}
                required
                onChange={(e) => setSpec({ ...spec, model: e.target.value })}
              />
            </label>
          )}
          <label className={styles.field}>
            思考强度
            <select value={spec.effort} onChange={(e) => setSpec({ ...spec, effort: e.target.value })}>
              {DISPATCH_EFFORTS[spec.engine].map((effort) => (
                <option key={effort} value={effort}>
                  {DISPATCH_EFFORT_LABELS[effort]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            说明（选填）
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              placeholder="留空记为“看板修改”"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button type="submit" disabled={!model || (unchanged && !note.trim())}>
              {writing ? '保存中…' : '确定'}
            </button>
          </div>
        </fieldset>
      </form>
    </div>,
    document.body,
  );
}
