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
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

// Map a notification's type/data to an admin-side route so clicking the
// card jumps straight to the matching section. Falls back to /notifications.
const linkForAdmin = (item: any): string => {
  const t = String(item?.type || '').toLowerCase();
  const d = item?.data || {};
  if (t === 'order' && d.orderId) return `/orders/${d.orderId}`;
  if (t === 'order') return `/orders`;
  if (t === 'vendororder' && d.vendorOrderId) return `/orders/vendor-orders`;
  if (t === 'payout' && d.payoutId) return `/payouts`;
  if (t === 'payout') return `/payouts`;
  if (t === 'rfq' && d.rfqId) return `/negotiations/custom-production/${d.rfqId}`;
  if (t === 'rfq') return `/negotiations/custom-production`;
  if (t === 'offer' && d.offerId) return `/negotiations/bulk-offers/${d.offerId}`;
  if (t === 'offer') return `/negotiations/bulk-offers`;
  if (t === 'support' && d.ticketId) return `/support/tickets`;
  if (t === 'support') return `/support/tickets`;
  if (t === 'dispute' && d.disputeId) return `/disputes`;
  if (t === 'dispute') return `/disputes`;
  if (t === 'announcement') return `/notifications`;
  return `/notifications`;
};

const MyNotifications: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'notifications', 'mine'],
    queryFn: async () => {
      const response = await api.get('/notifications/me');
      return response.data.items || [];
    },
  });

  const open = async (item: any) => {
    try {
      if (!item.isRead) {
        await api.post(`/notifications/${item._id}/read`);
      }
    } catch {
      /* ignore */
    }
    navigate(linkForAdmin(item));
  };

  return (
    <Stack spacing={3}>
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
