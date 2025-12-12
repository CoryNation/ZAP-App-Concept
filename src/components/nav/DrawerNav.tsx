'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import { getRoutes, RouteItem } from '../../lib/routes';
import { useAppMode } from '../../lib/contexts/ModeProvider';
import { baseRoute } from '../../lib/utils/modeRouter';

export default function DrawerNav() {
  const pathname = usePathname();
  const { mode } = useAppMode();
  const routes = getRoutes(mode);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    // Compare base routes to handle both /operations/downtime and /production-trials/operations/downtime
    const basePath = baseRoute(pathname);
    const baseHref = baseRoute(href);
    if (baseHref === '/') return basePath === '/';
    return basePath.startsWith(baseHref);
  };

  const renderItem = (item: RouteItem, index: number) => {
    // Section header (non-clickable)
    if (item.section) {
      return (
        <Box key={`section-${index}`} sx={{ mt: index === 0 ? 0 : 2, mb: 0.5 }}>
          <Typography
            variant="overline"
            sx={{
              px: 2,
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          >
            {item.label}
          </Typography>
        </Box>
      );
    }

    // Divider
    if (item.divider) {
      return <Divider key={`divider-${index}`} sx={{ my: 1 }} />;
    }

    // Regular navigation item
    const active = isActive(item.href);

    return (
      <ListItem key={item.href || index} disablePadding>
        <ListItemButton
          component={Link}
          href={item.href || '#'}
          selected={active}
          sx={{
            borderRadius: 1,
            mx: 1,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
          }}
        >
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: active ? 600 : 400,
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <List sx={{ py: 1 }}>
      {routes.map((item, index) => renderItem(item, index))}
    </List>
  );
}

