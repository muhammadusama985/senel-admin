import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const muiTheme = useMuiTheme();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const isLight = muiTheme.palette.mode === 'light';

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        color: muiTheme.palette.text.primary,
        background: isLight
          ? `
            radial-gradient(900px 320px at 12% -10%, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.03) 40%, transparent 70%),
            linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)
          `
          : `
            radial-gradient(1000px 320px at 18% -10%, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.05) 40%, transparent 70%),
            linear-gradient(180deg, #0a1020 0%, #0d1328 100%)
          `,
      }}
    >
      <Header onMenuClick={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { md: 'calc(100% - 260px)' },
          color: muiTheme.palette.text.primary,
          '& .page-shell': {
            backgroundColor: alpha(muiTheme.palette.background.paper, isLight ? 0.88 : 0.78),
            border: `1px solid ${muiTheme.palette.divider}`,
            borderRadius: 2,
            padding: { xs: muiTheme.spacing(1.5), sm: muiTheme.spacing(2), md: muiTheme.spacing(2.5) },
            boxShadow: isLight
              ? '0 12px 40px rgba(15,23,42,0.08)'
              : '0 18px 40px rgba(0,0,0,0.28)',
            backdropFilter: 'blur(10px)',
            overflowX: 'auto',
            '& > :first-child': {
              marginTop: 0,
            },
            '& .MuiTableContainer-root': {
              overflowX: 'auto',
            },
            '& table': {
              minWidth: { xs: 640, md: 0 },
            },
            '& .MuiStack-root': {
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: { xs: 1, sm: 1.5 },
            },
          },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
