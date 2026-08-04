import React from 'react';
import {
  Paper,
  Stack,
  Typography,
  Alert,
  Button,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

const MyNotifications: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'notifications', 'mine'],
    queryFn: async () => {
      const response = await api.get('/notifications/me');
      return response.data.items || [];
    },
  });

  // Click a card -> mark it read (no navigation).
  const open = async (item: any) => {
    if (!item.isRead) {
      try {
        await api.post(`/notifications/${item._id}/read`);
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'mine'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <Stack spacing={3}>
      {/* Notification popup alert is rendered globally by the Header. */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5">My Notifications</Typography>
        <Typography variant="body2" color="text.secondary">
          Personal notifications addressed to you. Click any card to jump to the matching section.
        </Typography>
      </Paper>

      {error ? <Alert severity="error">Failed to load notifications.</Alert> : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !data || data.length === 0 ? (
        <Paper sx={{ p: 4 }}>
          <Typography color="text.secondary">No notifications yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {data.map((item: any) => (
            <Paper
              key={item._id}
              role="button"
              tabIndex={0}
              onClick={() => open(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open(item);
                }
              }}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                opacity: item.isRead ? 0.7 : 1,
                borderLeft: item.isRead ? 'none' : '4px solid',
                borderLeftColor: 'primary.main',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: item.isRead ? 500 : 700 }}>
                    {item.title}
                  </Typography>
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
                      open(item);
                    }}
                  >
                    Open
                  </Button>
                ) : null}
              </Stack>
            </Paper>
          ))}
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Click a notification to mark it read and jump to its source.
          </Typography>
        </Stack>
      )}
    </Stack>
  );
};

export default MyNotifications;
