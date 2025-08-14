'use client';
import { CssBaseline, AppBar, Toolbar, Box, Container, Button } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import theme from '../lib/theme';
import { ThemeProvider } from '@mui/material/styles';

// Optional: small brand bar using secondary color
function BrandBar() {
  return (
    <Box sx={{ height: 4, bgcolor: 'secondary.main' }} />
  );
}

export const metadata = { title: 'ZAP App' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrandBar />
          <AppBar color="default" position="sticky" elevation={0}>
            <Toolbar sx={{ gap: 2 }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                {/* Adjust width/height to your logo asset */}
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
      </body>
    </html>
  );
}
