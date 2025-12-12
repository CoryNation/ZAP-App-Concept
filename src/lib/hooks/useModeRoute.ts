/**
 * Hook for mode-aware routing
 * 
 * Provides a convenient way to generate mode-aware routes in components
 */

import { useAppMode } from '../contexts/ModeProvider';
import { modeRoute } from '../utils/modeRouter';

/**
 * Hook that returns a function to generate mode-aware routes
 * 
 * @returns A function that takes a base route and returns the mode-aware route
 * 
 * @example
 * const getRoute = useModeRoute();
 * const downtimeRoute = getRoute('/operations/downtime');
 */
export function useModeRoute() {
  const { mode } = useAppMode();
  
  return (baseRoute: string) => modeRoute(baseRoute, mode);
}

