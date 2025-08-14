'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline, AppBar, Toolbar, Box, Container, Button,
  TextField, MenuItem, Stack, Tooltip
} from '@mui/material';
import theme from '../lib/theme';
import { supabase } from '../lib/supabaseClient';
import { useScope, setScope } from '../lib/scope';

export default function ClientThemeProvider({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  // Global scope
  const [scope] = useScope(); // { factoryId, lineId }

  // Data needed for menus
  const [factories, setFactories] = useState([]);
  const [lines, setLines] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Load session + role (to show Admin link) and factories (RLS will scope to company)
  useEffect(() => {
    if (isLogin) return; // no nav on login
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Auth error:', error.message);
        return;
      }
      if (!session) {
        setIsAdmin(false);
        setSessionReady(true);
        return;
      }

      // role for Admin link
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setIsAdmin((prof?.role ?? '') === 'admin');

      // factories in my RLS scope
      const { data: fs } = await supabase
        .from('factories')
        .select('id,name')
        .order('name');
      setFactories(fs || []);

      setSessionReady(true);
    })();
  }, [isLogin]);

  // Load lines when factory selection changes
  useEffect(() => {
    if (isLogin) return;
    (async () => {
      if (!scope.factoryId) {
        setLines([]);
        return;
      }
      const { data: ls } = await supabase
        .from('lines')
        .select('id,name,factory_id')
        .eq('factory_id', scope.factoryId)
        .order('name');
      setLines(ls || []);
    })();
  }, [isLogin, scope.factoryId]);

  // Handlers
  function onFactoryChange(e) {
    const factoryId = e.target.value || null; // "" => (All)
    // clear line when factory changes
    setScope({ factoryId, lineId: null });
  }
  function onLineChange(e) {
    const lineId = e.target.value || null; // "" => (All)
    setScope({ lineId });
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    // Hard redirect to avoid stale client state
    window.location.href = '/login';
  }

  // Simple active state for nav buttons
const activeKey = useMemo(() => {
  if (pathname.startsWith('/factory-performance')) return 'factory';
  if (pathname.startsWith('/work-requests')) return 'work';
  if (pathname.startsWith('/inventory')) return 'inv';
  if (pathname.startsWith('/greasy-twin')) return 'grease';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
}, [pathname]);


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {isLogin ? (
        // Full‑bleed wrapper for the login route (no AppBar/Container)
        <Box sx={{ width: '100vw', minHeight: '100vh' }}>
          {children}
        </Box>
      ) : (
        <>
          {/* Top accent bar to reflect brand secondary */}
          <Box sx={{ height: 4, bgcolor: 'secondary.main' }} />

          <AppBar color="default" position="sticky" elevation={0}>
            <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
              {/* Logo → Dashboard */}
              <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/zekelman-logo.png"
                  alt="Zekelman"
                  width={120}
                  height={30}
                  priority
                />
              </Link>

              {/* Spacer */}
              <Box sx={{ flexGrow: 1 }} />

              {/* Factory/Line scope (hidden until we know session; still guarded by RLS) */}
              {sessionReady && (
                <Stack direction="row" spacing={1} sx={{ mr: 1 }} alignItems="center">
                  <Tooltip title="Filter all pages by Factory">
                    <TextField
                      size="small"
                      label="Factory"
                      select
                      value={scope.factoryId || ''}
                      onChange={onFactoryChange}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="">(All)</MenuItem>
                      {factories.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </TextField>
                  </Tooltip>

                  <Tooltip title="Filter by Line (within the selected Factory)">
                    <TextField
                      size="small"
                      label="Line"
                      select
                      value={scope.lineId || ''}
                      onChange={onLineChange}
                      sx={{ minWidth: 160 }}
                      disabled={!scope.factoryId}
                    >
                      <MenuItem value="">(All)</MenuItem>
                      {lines.map(l => (
                        <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                      ))}
                    </TextField>
                  </Tooltip>
                </Stack>
              )}

              {/* Primary nav */}
              <Button
                component={Link}
                href="/"
                color={activeKey === 'home' ? 'primary' : 'inherit'}
              >
                Dashboard
              </Button>
<Button
  component={Link}
  href="/factory-performance"
  color={activeKey === 'factory' ? 'primary' : 'inherit'}
>
  Factory Performance
</Button>

              <Button
                component={Link}
                href="/work-requests"
                color={activeKey === 'work' ? 'primary' : 'inherit'}
              >
                Work Requests
              </Button>
              <Button
                component={Link}
                href="/inventory"
                color={activeKey === 'inv' ? 'primary' : 'inherit'}
              >
                Inventory
              </Button>
              <Button
                component={Link}
                href="/greasy-twin"
                color={activeKey === 'grease' ? 'primary' : 'inherit'}
              >
                Greasy Twin
              </Button>

              {/* Admin (only if role=admin) */}
              {isAdmin && (
                <Button
                  component={Link}
                  href="/admin/users"
                  color={activeKey === 'admin' ? 'primary' : 'inherit'}
                >
                  Admin
                </Button>
              )}

              {/* Logout */}
              <Button onClick={handleLogout} color="primary" variant="outlined">
                Logout
              </Button>
            </Toolbar>
          </AppBar>

          {/* Page content container */}
          <Container maxWidth="lg" sx={{ py: 3 }}>
            {children}
          </Container>
        </>
      )}
    </ThemeProvider>
  );
}
