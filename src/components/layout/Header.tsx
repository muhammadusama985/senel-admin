import React, { useEffect, useRef, useState } from 'react';
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
  Paper,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
import { hasNotificationAlertBeenSeen, markNotificationAlertSeen } from '../../utils/notificationAlertStore';
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

  // Unread personal-notification count for the bell-icon badge. Uses the
  // existing /notifications/me endpoint with unreadOnly=true + limit=1 so we
  // only read the `total` counter (no backend change required). Polled every
  // 30s so the badge updates as soon as a new notification arrives for this
  // admin.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/me', {
        params: { unreadOnly: 'true', limit: 1 },
      });
      return Number(response.data?.total || 0);
    },
    refetchInterval: 30000,
  });

  // Global notification popup: whenever the admin is signed in (on ANY page),
  // poll the latest unread notifications and surface any brand-new ones as
  // a toast-style alert in the top-right corner. Polled every 10s so the popup
  // surfaces promptly after a new notification arrives.
  const [alertItem, setAlertItem] = useState<any | null>(null);
  const alertAutoCloseRef = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    const fetchLatest = async () => {
      try {
        const response = await api.get('/notifications/me', {
          params: { unreadOnly: 'true', limit: 5 },
        });
        const items: any[] = Array.isArray(response.data?.items)
          ? response.data.items
          : [];
        if (!alive) return;
        // Surface the first notification that has not been alerted yet.
        // IDs are tracked in a shared session-storage store so the
        // notifications-page popup and this global popup never duplicate.
        const brandNew = items.find(
          (n) => n && n._id && !hasNotificationAlertBeenSeen(n._id)
        );
        if (brandNew) {
          markNotificationAlertSeen(brandNew._id);
          setAlertItem(brandNew);
        }
      } catch {
        /* swallow -- silent popup failure */
      }
    };
    void fetchLatest();
    const id = window.setInterval(fetchLatest, 10000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  // Auto-dismiss the popup after 5 seconds.
  useEffect(() => {
    if (!alertItem) return;
    if (alertAutoCloseRef.current) window.clearTimeout(alertAutoCloseRef.current);
    alertAutoCloseRef.current = window.setTimeout(() => setAlertItem(null), 5000);
    return () => {
      if (alertAutoCloseRef.current) window.clearTimeout(alertAutoCloseRef.current);
    };
  }, [alertItem]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMyAccount = () => {
    handleClose();
    navigate('/settings/password-reset');
  };

  const handleNotifications = () => {
    navigate('/my-notifications');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login', { replace: true });
  };

  const isLight = muiTheme.palette.mode === 'light';

  return (
    <>
      {/* Global notification popup alert (top-right, auto-dismisses after 5s).
          Rendered here so it appears regardless of which page the admin is on. */}
      {alertItem ? (
        <Paper
          role="alertdialog"
          aria-live="assertive"
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 1400,
            maxWidth: 360,
            p: 1.5,
            borderLeft: '4px solid',
            borderLeftColor: 'error.main',
            boxShadow: 6,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">{alertItem.title}</Typography>
              {alertItem.body ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {alertItem.body}
                </Typography>
              ) : null}
            </Box>
            <IconButton
              size="small"
              onClick={() => setAlertItem(null)}
              aria-label="Dismiss"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      ) : null}
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
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : notificationCount}
            color="error"
            invisible={unreadCount === 0 && notificationCount === 0}
          >
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
          <MenuItem onClick={handleMyAccount}>{t('header.myAccount')}</MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>{t('header.logout')}</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
    </>
  );
};

export default Header;
