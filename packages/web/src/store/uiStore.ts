import { createStore } from 'zustand/vanilla';
import { readPreference, writePreference } from './persist';
import type { RequirementFilter } from '../domain/requirements';
import type { Filter } from '../domain/types';
import type { AquariusStyle } from '../sky/geometry/figures/aquariusDrops';
export interface UIState extends Filter {
  system: string;
  view: 'tasks' | 'reqs';
  requirementsFilter: RequirementFilter;
  pinned: number;
  hovered: number;
  sky: boolean;
  input: 'pad' | 'mouse';
  inputChosen: boolean;
  projection: boolean;
  /** Release history on the star chart: the drop string (default) or the original jar. */
  aquariusStyle: AquariusStyle;
  selected: string | null;
  selectedRelease: string | null;
  deliveryVersion: string | null;
  releaseFocus: string | null;
  dip: number;
  dipAll: boolean;
  dipKeyboard: boolean;
}
export const viewFromHash = () =>
  typeof window !== 'undefined' && window.location.hash === '#reqs' ? 'reqs' : 'tasks';
export const uiStore = createStore<UIState>(() => ({
  system: readPreference('board-system'),
  view: viewFromHash(),
  requirementsFilter: { query: '', priority: '', status: '', gapsOnly: false },
  query: '',
  mineOnly: false,
  pinned: -1,
  hovered: -1,
  sky: false,
  input: readPreference('board-input') === 'pad' ? 'pad' : 'mouse',
  inputChosen: !!readPreference('board-input'),
  projection: !!readPreference('board-proj'),
  aquariusStyle: readPreference('sky-aquarius') === 'jar' ? 'jar' : 'drops',
  selected: null,
  selectedRelease: null,
  deliveryVersion: null,
  releaseFocus: null,
  dip: -1,
  dipAll: false,
  dipKeyboard: false,
}));
export const selectSystem = (system: string) => {
  writePreference('board-system', system);
  uiStore.setState({ system, pinned: -1, selectedRelease: null, deliveryVersion: null });
};
export const setInput = (input: 'pad' | 'mouse', save = true) => {
  if (save) writePreference('board-input', input);
  uiStore.setState({ input, inputChosen: true });
};
export const setProjection = (projection: boolean) => {
  writePreference('board-proj', projection ? '1' : '');
  uiStore.setState({ projection });
};
export const setAquariusStyle = (aquariusStyle: AquariusStyle) => {
  writePreference('sky-aquarius', aquariusStyle);
  uiStore.setState({ aquariusStyle });
};
export const setSky = (sky: boolean) =>
  uiStore.setState({ sky, ...(!sky ? { selected: null, selectedRelease: null, deliveryVersion: null, dip: -1 } : {}) });
export function openDip(dip: number, toggle = false, keyboard = false) {
  const s = uiStore.getState();
  uiStore.setState({
    selected: null,
    selectedRelease: null,
    deliveryVersion: null,
    dipKeyboard: keyboard,
    dip: toggle && s.dip === dip ? -1 : dip,
    ...(s.dip !== dip ? { dipAll: false } : {}),
  });
}
export function escapeLayer() {
  const s = uiStore.getState();
  if (s.selected || s.selectedRelease)
    uiStore.setState({ selected: null, selectedRelease: null, deliveryVersion: null });
  else if (s.dip >= 0) uiStore.setState({ dip: -1 });
  else if (!s.sky && s.pinned >= 0) uiStore.setState({ pinned: -1 });
  else if (s.sky) setSky(false);
}

export function setView(view: UIState['view']) {
  uiStore.setState({ view });
  if (window.location.hash !== '#' + view) window.location.hash = view;
}
