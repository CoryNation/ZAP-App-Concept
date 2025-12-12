// Route configuration for the ZAP App navigation drawer
import { AppMode } from './contexts/ModeProvider';
import { modeRoute } from './utils/modeRouter';

export interface RouteItem {
  label: string;
  href?: string;
  icon?: string;
  divider?: boolean;
  section?: boolean; // Section header (non-clickable)
  children?: RouteItem[];
}

// Base route definitions for POC mode (without mode prefix)
const pocRoutes: RouteItem[] = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Operations',
    section: true,
  },
  {
    label: 'Plant Performance',
    href: '/operations/plant-performance',
  },
  {
    label: 'Line Speed',
    href: '/operations/line-speed',
  },
  {
    label: 'Downtime',
    href: '/operations/downtime',
  },
  {
    label: 'Quality',
    href: '/operations/quality',
  },
  {
    label: 'Greasy Twin',
    href: '/operations/greasy-twin',
  },
  {
    label: 'Requests & Maintenance',
    section: true,
  },
  {
    label: 'Work Requests',
    href: '/requests',
  },
  {
    label: 'Improvement & Ideas',
    section: true,
  },
  {
    label: 'Inspiration Gallery',
    href: '/inspiration',
  },
  {
    label: 'Concepts & Proposals',
    href: '/improvement/concepts',
  },
  {
    label: 'Recognition',
    section: true,
  },
  {
    label: 'Plant Wins',
    href: '/recognition/wins',
  },
  {
    label: 'Admin & Data',
    section: true,
  },
  {
    label: 'User Management',
    href: '/admin/users',
  },
  {
    label: 'Settings',
    href: '/settings',
  },
];

// Base route definitions for Production Trials mode
const prodTrialsRoutes: RouteItem[] = [
  {
    label: 'Downtime Dashboard',
    href: '/operations/downtime',
  },
];

/**
 * Get mode-aware routes for navigation
 * 
 * @param mode - The current app mode
 * @returns Routes with hrefs prefixed based on mode
 */
export function getRoutes(mode: AppMode): RouteItem[] {
  // Use different route sets based on mode
  const baseRoutes = mode === 'prod_trials' ? prodTrialsRoutes : pocRoutes;
  
  return baseRoutes.map(route => {
    // Section headers and dividers don't have hrefs, return as-is
    if (route.section || route.divider || !route.href) {
      return route;
    }

    // Apply mode-aware routing
    return {
      ...route,
      href: modeRoute(route.href, mode),
    };
  });
}

/**
 * Default routes export (for backward compatibility)
 * Note: This will use 'poc' mode by default. Use getRoutes() with useAppMode() for mode-aware routes.
 */
export const routes = getRoutes('poc');

