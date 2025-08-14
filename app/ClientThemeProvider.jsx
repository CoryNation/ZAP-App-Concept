'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline, AppBar, Toolbar, Box, Container, Button,
  TextField, MenuItem, Stack
} from '@mui/material';
import theme from '../lib/theme';
import { supabase } from '../lib/supabaseClient';
import { useScope, setScope } from '../lib/scope';

export default function ClientThemeProvider({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  // factory/line data only needed off login
  const [factories, setFactories] = useState([]);
  const [lines, setLines] = useState([]);
  const [scope] = useScope();

  useEffect(() => {
    if (isLogin) return;
    (async () => {
      const { data: fs } = await supabase.from('factories').select('id,name').order('name');
      setFactories(fs || []);
    })();
  }, [isLogin]);

  useEffect(() => {
    if (isLogin) return;
    (async () => {
      if (!scope.factoryId) { setLines([]); return; }
      const { data: ls } = await supabase
        .from('lines').select('id,name,factory_id').eq('factory_id', scope.factoryId).order('name');
      setLines(ls || []);
    })();
  }, [isLogin, scope.factoryId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function onFactoryChange(e) {
    const factoryId = e.target.value || null;
    setScope({ factoryId, lineId: null });
  }
  function onLineChange(e) {
    const lineId = e.target.value || null;
    setScope({ lineId });
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {isLogin ? (
        // FULL-BLEED WRAPPER FOR LOGIN
        <Box sx={{ width: '100vw', minHeight: '100vh', p: 0, m: 0 }}>{children}</Box>
      ) : (
        <>
          <Box sx={{ height: 4, bgcolor: 'secondary.main' }} />
          <AppBar color="default" position="sticky" elevation={0}>
            <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                <Image src="/zekelman-logo.png" alt="Zekelman" width={120} height={30} priority />
              </Link>
              <Box sx={{ flexGrow: 1 }} />

              {/* Scope selectors */}
              <Stack direction="row" spacing={1} sx={{ mr: 1 }}>
                <TextField
                  size="small"
                  label="Factory"
                  select
                  value={scope.factoryId || ''}
                  onChange={onFactoryChange}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">(All)</MenuItem>
                  {factories.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </TextField>

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
                  {lines.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                </TextField>
              </Stack>

              <Button component={Link} href="/" color="primary">Dashboard</Button>
              <Button component={Link} href="/work-requests" color="primary">Work Requests</Button>
              <Button component={Link} href="/inventory" color="primary">Inventory</Button>
              <Button component={Link} href="/greasy-twin" color="primary">Greasy Twin</Button>
              <Button onClick={handleLogout} color="primary" variant="outlined">Logout</Button>
            </Toolbar>
          </AppBar>

          <Container maxWidth="lg" sx={{ py: 3 }}>
            {children}
          </Container>
        </>
      )}
    </ThemeProvider>
  );
}
