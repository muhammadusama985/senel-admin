import { alpha, createTheme } from '@mui/material/styles';

const brand = {
  navy: '#080321',
  indigo: '#1f2a7a',
  purple: '#8b5cf6',
  gold: '#f59e0b',
  blue: '#2563eb',
  rose: '#ec4899',
};

const brandGradient = 'linear-gradient(90deg, #5B2EFF 0%, #8A2BE2 40%, #FF6A00 100%)';

function buildTheme(mode: 'light' | 'dark') {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? brand.purple : brand.purple,
      },
      secondary: {
        main: isLight ? brand.gold : '#fbbf24',
      },
      background: {
        default: isLight ? '#f4f7fb' : '#0b1020',
        paper: isLight ? '#ffffff' : '#121a30',
      },
      text: {
        primary: isLight ? '#111827' : '#f8fafc',
        secondary: isLight ? '#475569' : '#cbd5e1',
      },
      divider: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
      success: {
        main: '#16a34a',
      },
      warning: {
        main: '#d97706',
      },
      error: {
        main: '#dc2626',
      },
      info: {
        main: brand.blue,
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: isLight
              ? 'linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)'
              : 'linear-gradient(180deg, #0a1020 0%, #0d1328 100%)',
            color: isLight ? '#111827' : '#f8fafc',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: isLight
              ? '0 10px 30px rgba(15,23,42,0.06)'
              : '0 14px 34px rgba(0,0,0,0.28)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
          },
          head: {
            fontWeight: 700,
            color: isLight ? '#1e293b' : '#e2e8f0',
            backgroundColor: isLight ? alpha('#1e293b', 0.03) : alpha('#ffffff', 0.03),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          contained: {
            background: brandGradient,
            color: '#fff',
            boxShadow: isLight
              ? '0 10px 24px rgba(139,92,246,0.22)'
              : '0 10px 24px rgba(0,0,0,0.3)',
            '&:hover': {
              background: brandGradient,
              boxShadow: isLight
                ? '0 14px 30px rgba(139,92,246,0.28)'
                : '0 14px 30px rgba(0,0,0,0.36)',
            },
            '&.Mui-disabled': {
              background: isLight ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.45)',
              color: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(226,232,240,0.7)',
              boxShadow: 'none',
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
