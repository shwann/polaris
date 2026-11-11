import { useEffect } from 'react';
import { localCredentials } from '../data/localWrite';
import { openSource } from '../data/openSource';
import { acceptSnapshot, dataStore } from '../store/dataStore';
export function useDataSource() {
  useEffect(() => {
    let active = true,
      dispose: (() => void) | undefined,
      boot: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (active && !dataStore.getState().connected)
        dataStore.setState({ message: '暂时连不上进度数据，显示的内容可能不是最新的。' });
    }, 10000);
    const fail = (e: unknown) => {
      if (!active) return;
      clearTimeout(timer);
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : 'unavailable';
      dataStore.setState({
        connected: false,
        label: 'LINK LOST',
        message: `进度数据读取中断（${code}），刷新页面可重试。`,
      });
    };
    void openSource()
      .then((source) => {
        if (!active) return;
        if (!source) {
          clearTimeout(timer);
          dataStore.setState({
            label: 'OFFLINE',
            message: '这个视图读不到进度数据。请登录 claude.ai 后在浏览器或 Claude App 中打开。',
          });
          return;
        }
        dataStore.setState({ origin: source.kind, credentials: localCredentials(source.kind) });
        dispose = source.subscribe(({ snapshot, confirmed }) => {
          if (!active) return;
          if (confirmed) {
            clearTimeout(timer);
            dataStore.setState({ label: source.label });
          }
          acceptSnapshot(snapshot, confirmed);
          if (!boot && !dataStore.getState().booted)
            boot = setTimeout(() => dataStore.setState({ booted: true }), 1500);
        }, fail);
      })
      .catch(fail);
    return () => {
      active = false;
      dataStore.setState({ credentials: null });
      dispose?.();
      clearTimeout(timer);
      clearTimeout(boot);
    };
  }, []);
}
