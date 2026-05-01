import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import Logo from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { mode, toggleTheme } = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['admin', 'notification-campaigns', 'count'],
    queryFn: async () => {
      const response = await api.get('/admin/notification-campaigns');
      return Array.isArray(response.data?.items) ? response.data.items.length : 0;
    },
    refetchInterval: 30000,
  });

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/settings/password-reset');
  };

  const handleMyAccount = () => {
    handleClose();
    navigate('/settings/tax');
  };

  const handleNotifications = () => {
    navigate('/notifications');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login', { replace: true });
  };

  const isLight = muiTheme.palette.mode === 'light';

  return (
    <AppBar
      position="fixed"
      color="transparent"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: `1px solid ${muiTheme.palette.divider}`,
        background: isLight
          ? 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(244,247,251,0.96) 100%)'
          : 'linear-gradient(135deg, rgba(8,3,33,0.92) 0%, rgba(17,24,39,0.94) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: isLight
          ? '0 10px 30px rgba(15,23,42,0.08)'
          : '0 10px 30px rgba(0,0,0,0.28)',
        color: muiTheme.palette.text.primary,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 1, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            flexGrow: 0,
            mr: 2,
            height: isMobile ? 48 : 64,
            display: 'flex',
            alignItems: 'center',
            '& img': {
              height: '100%',
              width: { xs: '122px', sm: '138px', md: '150px' },
            },
          }}
        >
          <Logo height={isMobile ? 48 : 64} />
        </Box>

        {!isMobile && (
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            {t('header.adminDashboard')}
          </Typography>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {!isMobile && <LanguageSwitcher />}

        {!isMobile && (
          <Box
            sx={{
              width: 1,
              height: 24,
              bgcolor: alpha(muiTheme.palette.text.primary, 0.16),
              mx: 1.5,
            }}
          />
        )}

        <IconButton color="inherit" onClick={toggleTheme} aria-label="toggle theme">
          {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>

        <IconButton color="inherit" aria-label="notifications" onClick={handleNotifications}>
          <Badge badgeContent={notificationCount} color="error" invisible={notificationCount === 0}>
            <NotificationsIcon />
          </Badge>
        </IconButton>

        <IconButton onClick={handleMenu} color="inherit">
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: isLight ? muiTheme.palette.primary.main : muiTheme.palette.secondary.main,
              color: isLight ? '#fff' : '#111827',
            }}
          >
            <AccountCircleIcon />
          </Avatar>
        </IconButton>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
          <MenuItem onClick={handleProfile}>{t('header.profile')}</MenuItem>
          <MenuItem onClick={handleMyAccount}>{t('header.myAccount')}</MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>{t('header.logout')}</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
