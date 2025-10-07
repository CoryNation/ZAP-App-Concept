// Route configuration for the ZAP App navigation drawer
export interface RouteItem {
  label: string;
  href?: string;
  icon?: string;
  divider?: boolean;
  section?: boolean; // Section header (non-clickable)
  children?: RouteItem[];
}

export const routes: RouteItem[] = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Operations',
    section: true,
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
    label: 'Admin',
    href: '/admin',
  },
  {
    label: 'Settings',
    href: '/settings',
  },
];

