import { localWritePending, localWriteVersion } from './localWrite';
import type { DataSource } from './DataSource';
import { normalize } from './normalize';
export function localSource(fetcher: typeof fetch = fetch, page: Document = document): DataSource {
  return {
    kind: 'local',
    label: 'LOCAL · 本机',
    subscribe(onData, onError) {
      let last = '',
        failed = false,
        active = true,
        busy = false;
      const controller = new AbortController();
      const pull = async () => {
        if (!active || busy || localWritePending() || page.visibilityState !== 'visible') return;
        busy = true;
        const revision = localWriteVersion();
        try {
          const response = await fetcher('data.json', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw { code: 'HTTP ' + response.status };
          const text = await response.text();
          if (!active || revision !== localWriteVersion()) return;
          if (text !== last || failed) {
            const snapshot = normalize(JSON.parse(text));
            last = text;
            failed = false;
            onData({ snapshot, confirmed: true });
          }
        } catch (e) {
          if (active && revision === localWriteVersion()) {
            failed = true;
            onError(e);
          }
        } finally {
          busy = false;
        }
      };
      void pull();
      const timer = setInterval(() => void pull(), 3000);
      return () => {
        active = false;
        clearInterval(timer);
        controller.abort();
      };
    },
  };
}
