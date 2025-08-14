'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Box, Container, Button } from '@mui/material';
import theme from '../lib/theme';
import { supabase } from '../lib/supabaseClient';

export default function ClientThemeProvider({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: 4, bgcolor: 'secondary.main' }} />
      <AppBar color="default" position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/zekelman-logo.png" alt="Zekelman" width={120} height={30} priority />
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          {!isLogin && (
            <>
              <Button component={Link} href="/" color="primary">Dashboard</Button>
              <Button component={Link} href="/work-requests" color="primary">Work Requests</Button>
              <Button component={Link} href="/inventory" color="primary">Inventory</Button>
              <Button component={Link} href="/greasy-twin" color="primary">Greasy Twin</Button>
              <Button onClick={handleLogout} color="primary" variant="outlined">Logout</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </ThemeProvider>
  );
}
