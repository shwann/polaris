import { useEffect } from 'react';
import { useUI } from './useBoard';
import { layoutRegistry } from '../layout/LayoutRegistry';
export function useProjection() {
  const { projection, sky } = useUI();
  useEffect(() => {
    document.documentElement.classList.toggle('proj', projection);
    layoutRegistry.update();
  }, [projection]);
  useEffect(() => {
    document.documentElement.classList.toggle('sky', sky);
  }, [sky]);
}
