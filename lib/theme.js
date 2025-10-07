'use client';
import { createTheme } from '@mui/material/styles';

const brandRed = '#E51837';   // Zekelman brand
const primaryRed = '#b51e27';  // ZAP App primary

const theme = createTheme({
  cssVariables: true, // enables MD-like color vars
  palette: {
    mode: 'light',
    primary: {
      main: primaryRed,
      contrastText: '#ffffff'
    },
    secondary: {
      main: brandRed
    },
    success: {
      main: '#2e7d32'
    },
    warning: {
      main: '#ed6c02'
    },
    error: {
      main: '#d32f2f'
    },
    background: {
      default: '#f7f7f9',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 12 // MD3-ish rounded corners
  },
  typography: {
    fontFamily: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"`
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(0,0,0,0.08)'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0,0,0,0.08)'
        }
      }
    },
    MuiButton: {
      defaultProps: { variant: 'contained', size: 'medium' }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 }
      }
    }
  }
});

export default theme;
