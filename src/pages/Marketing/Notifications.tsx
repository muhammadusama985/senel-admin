import React, { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const initialForm = {
  title: '',
  body: '',
  targetRole: 'all',
  deepLink: '',
  status: 'draft',
};

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'notification-campaigns'],
    queryFn: async () => {
      const response = await api.get('/admin/notification-campaigns');
      return response.data.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/notification-campaigns', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notification-campaigns'] });
      setOpen(false);
      setForm(initialForm);
      setError('');
    },
    onError: (mutationError: any) => {
      setError(mutationError.response?.data?.message || 'Failed to create campaign');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/notification-campaigns/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notification-campaigns'] });
    },
  });

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', minWidth: 180, flex: 1 },
    { field: 'targetRole', headerName: 'Target', minWidth: 120 },
    { field: 'status', headerName: 'Status', minWidth: 120 },
    { field: 'createdAt', headerName: 'Created At', minWidth: 180, flex: 1 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <Button size="small" onClick={() => sendMutation.mutate(params.row._id)} disabled={params.row.status === 'sent' || sendMutation.isPending}>
          Send
        </Button>
      ),
    },
  ];

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4">{t('notifications.title')}</Typography>
            <Typography variant="body1" color="text.secondary">
              {t('notifications.intro')}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setOpen(true)}>
            New Campaign
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ height: 620 }}>
          <DataGrid rows={data} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </Box>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('notifications.title')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <TextField label="Body" fullWidth multiline minRows={4} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
            <TextField select label="Target Role" fullWidth value={form.targetRole} onChange={(e) => setForm((prev) => ({ ...prev, targetRole: e.target.value }))}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="customer">Customers</MenuItem>
              <MenuItem value="vendor">Vendors</MenuItem>
              <MenuItem value="admin">Admins</MenuItem>
            </TextField>
            <TextField label="Deep Link" fullWidth value={form.deepLink} onChange={(e) => setForm((prev) => ({ ...prev, deepLink: e.target.value }))} />
            <TextField select label="Status" fullWidth value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Send Now</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title.trim() || !form.body.trim()}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Notifications;
