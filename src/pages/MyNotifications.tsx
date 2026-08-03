import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Stack,
  Typography,
  Alert,
  Button,
  Box,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

// Admin-only personal-notifications feed. Mirrors the vendor / customer
// behaviour: clicking a notification marks it read AND, when the backend
// supplied a `link`, jumps to that section of the app.
const MyNotifications: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'notifications', 'mine'],
    queryFn: async () => {
      const response = await api.get('/notifications/me');
      return response.data.items || [];
    },
  });

  const openNotification = async (item: any) => {
    try {
      if (!item.isRead) {
        await api.post(`/notifications/${item._id}/read`);
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'mine'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
      }
    } catch {
      /* ignore */
    }
    if (item.link) navigate(item.link);
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    } catch (err: any) {
      setError(err.response?.data?.message || t('notifications.failedCreateCampaign', 'Failed to update notifications'));
    }
  };

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5">{t('notifications.myInboxTitle', 'My Notifications')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('notifications.myInboxSubtitle', 'Order, payout, RFQ, and support updates addressed to you.')}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={markAllRead} disabled={!data || data.length === 0}>
            {t('notifications.markAllRead', 'Mark All Read')}
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !data || data.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography color="text.secondary">{t('notifications.empty', 'No notifications yet.')}</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {data.map((item: any) => (
            <Paper
              key={item._id}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                opacity: item.isRead ? 0.7 : 1,
                borderLeft: item.isRead ? 'none' : '4px solid',
                borderLeftColor: 'primary.main',
                transition: 'border-color 0.1s ease, transform 0.1s ease',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
              role="button"
              tabIndex={0}
              onClick={() => openNotification(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openNotification(item);
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: item.isRead ? 500 : 700 }}>
                      {item.title}
                    </Typography>
                    {!item.isRead ? (
                      <Chip size="small" color="primary" label={t('notifications.newBadge', 'New')} />
                    ) : null}
                    {item.type ? (
                      <Chip size="small" variant="outlined" label={item.type} />
                    ) : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {item.body}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                {!item.isRead ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      openNotification(item);
                    }}
                  >
                    {t('notifications.open', 'Open')}
                  </Button>
                ) : null}
              </Stack>
            </Paper>
          ))}
          <Divider />
          <Typography variant="caption" color="text.secondary">
            {t('notifications.clickHint', 'Click a notification to mark it read and jump to its source.')}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
};

export default MyNotifications;
