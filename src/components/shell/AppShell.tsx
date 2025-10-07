'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  TextField,
  MenuItem,
  Stack,
  Tooltip,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DrawerNav from '../nav/DrawerNav';
import { useGlobalFilters } from '../../lib/state/globalFilters';
import { supabase } from '@/lib/supabaseClient';

const DRAWER_WIDTH = 260;

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Global filters from Zustand
  const { factoryId, lineId, timeRange, setFactoryId, setLineId, setTimeRange } = useGlobalFilters();

  // Data for selectors
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  const [lines, setLines] = useState<Array<{ id: string; name: string; factory_id: string }>>([]);
  const [sessionReady, setSessionReady] = useState(false);

  // Load factories on mount
  useEffect(() => {
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Auth error:', error.message);
        return;
      }
      if (!session) {
        setSessionReady(true);
        return;
      }

      // Load factories in RLS scope
      const { data: fs } = await supabase
        .from('factories')
        .select('id,name')
        .order('name');
      setFactories(fs || []);

      setSessionReady(true);
    })();
  }, []);

  // Load lines when factory changes
  useEffect(() => {
    (async () => {
      if (!factoryId) {
        setLines([]);
        return;
      }
      const { data: ls } = await supabase
        .from('lines')
        .select('id,name,factory_id')
        .eq('factory_id', factoryId)
        .order('name');
      setLines(ls || []);
    })();
  }, [factoryId]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            src="/zekelman-logo.png"
            alt="Zekelman"
            width={120}
            height={30}
            priority
          />
        </Link>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <DrawerNav />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Brand accent bar */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, bgcolor: 'secondary.main', zIndex: 1300 }} />

      {/* AppBar */}
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          top: 4,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ZAP App
          </Typography>

          {/* Global selectors */}
          {sessionReady && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Filter all pages by Factory">
                <TextField
                  size="small"
                  label="Factory"
                  select
                  value={factoryId || ''}
                  onChange={(e) => setFactoryId(e.target.value || null)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">(All)</MenuItem>
                  {factories.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Tooltip>

              <Tooltip title="Filter by Line (within the selected Factory)">
                <TextField
                  size="small"
                  label="Line"
                  select
                  value={lineId || ''}
                  onChange={(e) => setLineId(e.target.value || null)}
                  sx={{ minWidth: 120 }}
                  disabled={!factoryId}
                >
                  <MenuItem value="">(All)</MenuItem>
                  {lines.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Tooltip>

              <Tooltip title="Time range for data">
                <TextField
                  size="small"
                  label="Time Range"
                  select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="last24h">Last 24h</MenuItem>
                  <MenuItem value="last7d">Last 7d</MenuItem>
                  <MenuItem value="last30d">Last 30d</MenuItem>
                </TextField>
              </Tooltip>

              <Button onClick={handleLogout} color="primary" variant="outlined" size="small">
                Logout
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* Drawer - Permanent on desktop, Temporary on mobile */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              top: 4,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              top: 4,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px', // AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

