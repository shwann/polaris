import sharedStyles from '../components/Shared/Shared.module.css';
import type { SkyEngine } from '../sky/SkyEngine';
import { uiStore, setSky, setView } from '../store/uiStore';
import { dataStore } from '../store/dataStore';
import { flowTasks, laneTasks, searchTasks, selectView } from '../domain/selectors';
import { FIG_LANE } from '../domain/lanes';
import type { Lane } from '../domain/types';
let engine: SkyEngine | null = null;
export const attachEngine = (value: SkyEngine | null) => {
  engine = value;
};
export const getEngine = () => engine;
export function selectStar(id: string | null, keyboard = false) {
  uiStore.setState({ selected: id, selectedRelease: null, deliveryVersion: null, ...(id ? { dip: -1 } : {}) });
  if (id) {
    engine?.reveal(id);
    if (keyboard) requestAnimationFrame(() => document.getElementById('star-go')?.focus({ preventScroll: true }));
  }
}
export function selectFromSky(id: string | null, deliveryVersion: string | null = null) {
  uiStore.setState({ selected: id, selectedRelease: null, deliveryVersion, ...(id ? { dip: -1 } : {}) });
  if (id && innerWidth <= 560) engine?.reveal(id);
}
export function selectRelease(version: string | null) {
  uiStore.setState({ selected: null, selectedRelease: version, deliveryVersion: null, dip: -1 });
}
export function locateStar(id: string) {
  setSky(true);
  engine?.reveal(id, { zoom: 2.2 });
  selectStar(id, true);
}
export function stepStar(dir: number) {
  const u = uiStore.getState(),
    v = selectView(dataStore.getState().snapshot, u.system);
  if (u.selectedRelease) return;
  if (u.deliveryVersion) {
    const list = v.tasks.filter((t) => t.systemKey === v.system.key && t.shippedIn === u.deliveryVersion),
      i = list.findIndex((t) => t.id === u.selected);
    const task = list[(i + dir + list.length) % list.length];
    if (task) {
      selectFromSky(task.id, u.deliveryVersion);
      engine?.reveal(task.id);
      requestAnimationFrame(() => document.getElementById('star-go')?.focus({ preventScroll: true }));
    }
    return;
  }
  const group = FIG_LANE[u.dip] || v.tasks.find((t) => t.id === u.selected)?.lane,
    list = group ? laneTasks(v.tasks, group) : flowTasks(searchTasks(v.tasks, u));
  if (!list.length) return;
  const i = list.findIndex((t) => t.id === u.selected),
    index = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
  selectStar(list[index]!.id, true);
}
export function scrollToNode(node: Element | null, block: ScrollLogicalPosition = 'start') {
  if (!node) return;
  node.scrollIntoView?.({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block,
  });
}
export function goLane(lane: Lane | null) {
  if (uiStore.getState().view !== 'tasks') {
    setView('tasks');
    requestAnimationFrame(() => goLane(lane));
    return;
  }
  setSky(false);
  uiStore.setState({ dip: -1 });
  const node = document.getElementById(lane ? 'lane-' + lane : 'figures');
  const d = node?.closest('details');
  if (d) d.open = true;
  setTimeout(() => scrollToNode(node), 200);
}
export function pickOnBoard(id: string) {
  if (uiStore.getState().view !== 'tasks') {
    setView('tasks');
    requestAnimationFrame(() => pickOnBoard(id));
    return;
  }
  setSky(false);
  const find = () => document.querySelector(`#main [data-id="${CSS.escape(id)}"]`);
  let node = find();
  if (!node) {
    const u = uiStore.getState();
    if (!u.query && !u.mineOnly) return;
    uiStore.setState({ query: '', mineOnly: false });
    requestAnimationFrame(() => pickOnBoard(id));
    return;
  }
  for (let d = node.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
  setTimeout(() => {
    node = find();
    scrollToNode(node, 'center');
    if (node) {
      node.classList.remove(sharedStyles.pinged!);
      void (node as HTMLElement).offsetWidth;
      node.classList.add(sharedStyles.pinged!);
      setTimeout(() => node?.classList.remove(sharedStyles.pinged!), 2600);
    }
  }, 250);
}

/** Reveal release history, including a card outside the collapsed list. */
export function goRelease(version?: string) {
  if (uiStore.getState().view !== 'tasks') {
    setView('tasks');
    requestAnimationFrame(() => goRelease(version));
    return;
  }
  setSky(false);
  uiStore.setState({ dip: -1, releaseFocus: version ?? null });
  setTimeout(
    () =>
      scrollToNode(
        document.getElementById(version ? releaseNodeId(version) : 'release-log'),
        version ? 'center' : 'start',
      ),
    250,
  );
}
export const releaseNodeId = (version: string) => 'release-' + encodeURIComponent(version);
