import { useStore } from 'zustand';
import { dataStore } from '../store/dataStore';
import { uiStore } from '../store/uiStore';
import { selectView } from '../domain/selectors';
export const useData = () => useStore(dataStore);
export const useUI = () => useStore(uiStore);
export function useBoard() {
  const data = useData(),
    ui = useUI();
  return { data, ui, view: selectView(data.snapshot, ui.system) };
}
