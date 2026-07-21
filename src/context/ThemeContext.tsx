import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { lightTheme, darkTheme } from '../theme/theme';

type ThemeMode = 'light' | 'dark';

// Mirror of the vendor ThemeContext's color tokens so the shared
// PriceTierEditor / VariantEditor (ported from the vendor product form)
// can render with the same design and contrast in both light + dark mode.
export interface ThemeColors {
  primary: string;
  text: string;
  textMuted: string;
  surface: string;
  accentGold: string;
  accentBlue: string;
  accentGreen: string;
  accentRed: string;
  accentOrange: string;
  accentPurple: string;
  sidebarHover: string;
  border: string;
  cardBg: string;
  inputBg: string;
  headerBg: string;
  pageBg: string;
  buttonGradient: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const _gradient = 'linear-gradient(90deg, #5B2EFF 0%, #8A2BE2 40%, #FF6A00 100%)';

const _getColors = (mode: ThemeMode): ThemeColors =>
  mode === 'light'
    ? {
        primary: '#f7f8fc',
        text: '#111827',
        textMuted: '#4b5563',
        surface: '#ffffff',
        accentGold: '#FFD700',
        accentBlue: '#4169E1',
        accentGreen: '#16a34a',
        accentRed: '#dc2626',
        accentOrange: '#f97316',
        accentPurple: '#7c3aed',
        sidebarHover: 'rgba(91,46,255,0.08)',
        border: 'rgba(17,24,39,0.12)',
        cardBg: '#ffffff',
        inputBg: '#ffffff',
        headerBg: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,251,0.98) 100%)',
        pageBg: 'linear-gradient(180deg, #f7f8fc 0%, #eef2ff 100%)',
        buttonGradient: _gradient,
      }
    : {
        primary: '#080321',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.75)',
        surface: '#0f0a2d',
        accentGold: '#FFD700',
        accentBlue: '#4169E1',
        accentGreen: '#32CD32',
        accentRed: '#FF4444',
        accentOrange: '#FFA500',
        accentPurple: '#9370DB',
        sidebarHover: 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.14)',
        cardBg: '#1a123f',
        inputBg: '#120a34',
        headerBg: 'linear-gradient(180deg, rgba(8,3,33,0.98) 0%, rgba(15,10,45,0.98) 100%)',
        pageBg: 'linear-gradient(180deg, #080321 0%, #0d072b 100%)',
        buttonGradient: _gradient,
      };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  const theme = mode === 'light' ? lightTheme : darkTheme;
  const colors = useMemo(() => _getColors(mode), [mode]);

  const globalStyles = useMemo(
    () => ({
      'html, body': {
        height: '100%',
      },
      body: {
        margin: 0,
      },
      '#root': {
        minHeight: '100%',
      },
      'input::placeholder, textarea::placeholder': {
        color: mode === 'light' ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.55)',
        opacity: 1,
      },
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, colors }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={globalStyles} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

