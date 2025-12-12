/**
 * Mode-aware router helper
 * 
 * Automatically prefixes routes with /production-trials when mode is prod_trials,
 * otherwise uses the base route for poc mode.
 */

import { AppMode } from '../contexts/ModeProvider';

const PROD_TRIALS_PREFIX = '/production-trials';

/**
 * Converts a base route to a mode-aware route
 * 
 * @param baseRoute - The base route (e.g., '/operations/downtime')
 * @param mode - The current app mode
 * @returns The mode-aware route (e.g., '/production-trials/operations/downtime' for prod_trials)
 * 
 * @example
 * modeRoute('/operations/downtime', 'poc') // => '/operations/downtime'
 * modeRoute('/operations/downtime', 'prod_trials') // => '/production-trials/operations/downtime'
 */
export function modeRoute(baseRoute: string, mode: AppMode): string {
  // Home route stays the same
  if (baseRoute === '/') {
    return '/';
  }

  // Admin, settings, and auth routes stay the same regardless of mode
  const sharedRoutes = ['/admin', '/settings', '/login', '/join', '/invite', '/me'];
  if (sharedRoutes.some(route => baseRoute.startsWith(route))) {
    return baseRoute;
  }

  // For production trials, prefix with /production-trials
  if (mode === 'prod_trials') {
    return `${PROD_TRIALS_PREFIX}${baseRoute}`;
  }

  // For poc, return base route as-is
  return baseRoute;
}

/**
 * Converts a mode-aware route back to its base route
 * 
 * @param route - The full route (may include /production-trials prefix)
 * @returns The base route without the prefix
 * 
 * @example
 * baseRoute('/production-trials/operations/downtime') // => '/operations/downtime'
 * baseRoute('/operations/downtime') // => '/operations/downtime'
 */
export function baseRoute(route: string): string {
  if (route.startsWith(PROD_TRIALS_PREFIX)) {
    return route.slice(PROD_TRIALS_PREFIX.length) || '/';
  }
  return route;
}

/**
 * Checks if a route belongs to production trials
 * 
 * @param route - The route to check
 * @returns true if the route is a production trials route
 */
export function isProductionTrialsRoute(route: string): boolean {
  return route.startsWith(PROD_TRIALS_PREFIX);
}

