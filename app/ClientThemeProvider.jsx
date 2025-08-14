'use client';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Box, Container, Button } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import theme from '../lib/theme';

export default function ClientThemeProvider({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Thin brand bar in secondary color (your red) */}
      <Box sx={{ height: 4, bgcolor: 'secondary.main' }} />

      <AppBar color="default" position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/zekelman-logo.png" alt="Zekelman" width={110} height={28} priority />
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          <Button component={Link} href="/work-requests" color="primary" variant="text">Work Requests</Button>
          <Button component={Link} href="/inventory" color="primary" variant="text">Inventory</Button>
          <Button component={Link} href="/greasy-twin" color="primary" variant="text">Greasy Twin</Button>
          <Button component={Link} href="/me" color="primary" variant="outlined">My Profile</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </ThemeProvider>
  );
}
