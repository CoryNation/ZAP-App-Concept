'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import theme from '@/lib/theme';
import AppShell from '@/src/components/shell/AppShell';
import { ModeProvider } from '@/src/lib/contexts/ModeProvider';
import { DesignVariantProvider } from '@/src/lib/contexts/DesignVariantProvider';

export default function ClientThemeProvider({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ModeProvider>
        <DesignVariantProvider>
          {isLogin ? (
            // Full-bleed wrapper for the login route (no AppBar/Drawer)
            <Box sx={{ width: '100vw', minHeight: '100vh' }}>
              {children}
            </Box>
          ) : (
            // Main app shell with Drawer + AppBar
            <AppShell>{children}</AppShell>
          )}
        </DesignVariantProvider>
      </ModeProvider>
    </ThemeProvider>
  );
}
