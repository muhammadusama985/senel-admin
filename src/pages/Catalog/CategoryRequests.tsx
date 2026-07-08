import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Check, Close } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface CategoryRequest {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  vendorId?: { _id: string; storeName?: string };
  createdCategoryId?: { _id: string; name: string; slug: string } | null;
}

const STATUS_COLORS: Record<CategoryRequest['status'], 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const CategoryRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [decideDialog, setDecideDialog] = useState<{ request: CategoryRequest; mode: 'approve' | 'reject' } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const accent = muiTheme.palette.secondary.main;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const muted = muiTheme.palette.text.secondary;

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'category-requests', statusFilter],
    queryFn: async () => {
      const params = statusFilter === 'all' ? {} : { status: statusFilter };
      const response = await api.get('/admin/category-requests', { params });
      return (response.data.requests || []) as CategoryRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote: string }) => {
      const response = await api.post(`/admin/category-requests/${id}/approve`, { adminNote });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'category-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setDecideDialog(null);
      setAdminNote('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote: string }) => {
      const response = await api.post(`/admin/category-requests/${id}/reject`, { adminNote });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'category-requests'] });
      setDecideDialog(null);
      setAdminNote('');
    },
  });

  const counts = useMemo(() => {
    // We only know the current filter's count; show the active tab's count.
    return { active: requests.length };
  }, [requests.length]);

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
            Category Requests
          </Typography>
          <Typography variant="body2" sx={{ color: muted, mt: 0.5 }}>
            Review category requests submitted by vendors. Approving creates the category instantly.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/categories" variant="outlined">
          Back to Categories
        </Button>
      </Box>

      <Tabs
        value={statusFilter}
        onChange={(_event, value) => setStatusFilter(value)}
        sx={{ mb: 2, borderBottom: `1px solid ${border}` }}
      >
        <Tab value="pending" label="Pending" />
        <Tab value="approved" label="Approved" />
        <Tab value="rejected" label="Rejected" />
        <Tab value="all" label="All" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
          Failed to load category requests.
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
          No {statusFilter === 'all' ? '' : statusFilter} category requests.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {requests.map((request) => (
            <Card
              key={request._id}
              variant="outlined"
              sx={{ backgroundColor: surface, borderColor: border, '&:hover': { borderColor: accent } }}
            >
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="h6">{request.name}</Typography>
                      <Chip size="small" label={request.status.toUpperCase()} color={STATUS_COLORS[request.status]} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: muted }}>
                      Requested by {request.vendorId?.storeName || 'Unknown vendor'} ·{' '}
                      {new Date(request.createdAt).toLocaleString()}
                    </Typography>
                    {request.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {request.description}
                      </Typography>
                    )}
                    {request.adminNote && (
                      <Alert
                        severity={request.status === 'rejected' ? 'warning' : 'info'}
                        sx={{ mt: 1.5, backgroundColor: surface, border: `1px solid ${border}` }}
                      >
                        <strong>Admin note:</strong> {request.adminNote}
                      </Alert>
                    )}
                    {request.status === 'approved' && request.createdCategoryId && (
                      <Typography variant="body2" sx={{ color: muted, mt: 1 }}>
                        Created category: <strong>{request.createdCategoryId.name}</strong> ({request.createdCategoryId.slug})
                      </Typography>
                    )}
                  </Box>

                  {request.status === 'pending' && (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Approve and create this category">
                        <IconButton
                          color="success"
                          onClick={() => {
                            setAdminNote('');
                            setDecideDialog({ request, mode: 'approve' });
                          }}
                          sx={{ backgroundColor: alpha(muiTheme.palette.success.main, isLight ? 0.1 : 0.18), '&:hover': { backgroundColor: alpha(muiTheme.palette.success.main, 0.22) } }}
                        >
                          <Check />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject this request">
                        <IconButton
                          color="error"
                          onClick={() => {
                            setAdminNote('');
                            setDecideDialog({ request, mode: 'reject' });
                          }}
                          sx={{ backgroundColor: alpha(muiTheme.palette.error.main, isLight ? 0.1 : 0.18), '&:hover': { backgroundColor: alpha(muiTheme.palette.error.main, 0.22) } }}
                        >
                          <Close />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog
        open={Boolean(decideDialog)}
        onClose={() => {
          if (!approveMutation.isPending && !rejectMutation.isPending) {
            setDecideDialog(null);
            setAdminNote('');
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle sx={{ color: muiTheme.palette.text.primary }}>
          {decideDialog?.mode === 'approve' ? 'Approve category request' : 'Reject category request'}
        </DialogTitle>
        <Divider sx={{ borderColor: border }} />
        <DialogContent>
          {decideDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Category name:</strong> {decideDialog.request.name}
              </Typography>
              {decideDialog.request.description && (
                <Typography variant="body2">
                  <strong>Vendor note:</strong> {decideDialog.request.description}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: muted }}>
                {decideDialog.mode === 'approve'
                  ? 'Approving will create this category so the vendor can immediately use it for their products.'
                  : 'Rejecting will notify the vendor with this note (optional).'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={decideDialog.mode === 'reject' ? 'Reason for rejection (optional)' : 'Internal note (optional)'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={decideDialog.mode === 'reject' ? 'E.g. duplicates an existing category, naming policy, etc.' : 'E.g. created on 2024-01-15'}
              />
              {(approveMutation.error || rejectMutation.error) && (
                <Alert severity="error">Failed to process the request. Please try again.</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDecideDialog(null);
              setAdminNote('');
            }}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={decideDialog?.mode === 'reject' ? 'error' : 'success'}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            onClick={() => {
              if (!decideDialog) return;
              if (decideDialog.mode === 'approve') {
                approveMutation.mutate({ id: decideDialog.request._id, adminNote });
              } else {
                rejectMutation.mutate({ id: decideDialog.request._id, adminNote });
              }
            }}
          >
            {decideDialog?.mode === 'approve' ? 'Approve & Create' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryRequests;
