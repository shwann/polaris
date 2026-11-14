import { FIG_LANE } from '../domain/lanes';
import { laneTasks } from '../domain/selectors';
import type { Task } from '../domain/types';
import type { UIState } from '../store/uiStore';
import type { SkyState } from './types';

/** Closing a card retains one source; selecting another source replaces it. */
export function syncBeams(s: SkyState, u: Pick<UIState, 'sky' | 'dip' | 'dipAll' | 'selectedRelease'>, tasks: Task[]) {
  if (!u.sky) {
    s.beamSel = -1;
    s.beamRelease = null;
    s.beamAll = false;
    s.dipIds = [];
    return;
  }
  if (u.dip >= 0) {
    s.beamSel = u.dip;
    s.beamRelease = null;
    s.beamAll = u.dipAll;
  } else if (u.selectedRelease) {
    s.beamSel = -1;
    s.beamRelease = u.selectedRelease;
    s.beamAll = false;
  }
  const group = FIG_LANE[s.beamSel];
  s.dipIds = group ? (s.beamAll ? laneTasks(tasks, group) : laneTasks(tasks, group).slice(0, 8)).map((t) => t.id) : [];
}
