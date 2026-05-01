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
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'notification-campaigns', currentLanguage],
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
      setError(mutationError.response?.data?.message || t('notifications.failedCreateCampaign'));
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

  const translateNotificationTarget = (value?: string) => {
    const map: Record<string, string> = {
      all: t('notifications.all'),
      customer: t('notifications.customers'),
      vendor: t('notifications.vendors'),
      admin: t('notifications.admins'),
    };
    return value ? (map[value] || value) : '';
  };

  const translateNotificationStatus = (value?: string) => {
    const map: Record<string, string> = {
      draft: t('announcements.drafts'),
      sent: t('notifications.sendNow'),
    };
    return value ? (map[value] || value) : '';
  };

  const columns: GridColDef[] = [
    { field: 'title', headerName: t('notifications.campaignTitle'), minWidth: 180, flex: 1 },
    { field: 'targetRole', headerName: t('notifications.targetRole'), minWidth: 120, valueGetter: (_value, row) => translateNotificationTarget(row.targetRole) },
    { field: 'status', headerName: t('common.status'), minWidth: 120, valueGetter: (_value, row) => translateNotificationStatus(row.status) },
    { field: 'createdAt', headerName: t('notifications.createdAt'), minWidth: 180, flex: 1 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <Button size="small" onClick={() => sendMutation.mutate(params.row._id)} disabled={params.row.status === 'sent' || sendMutation.isPending}>
          {t('notifications.send')}
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
            {t('notifications.newCampaign')}
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ height: 620 }}>
          <DataGrid rows={data} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </Box>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('notifications.newCampaign')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label={t('notifications.campaignTitle')} fullWidth value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <TextField label={t('notifications.body')} fullWidth multiline minRows={4} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
            <TextField select label={t('notifications.targetRole')} fullWidth value={form.targetRole} onChange={(e) => setForm((prev) => ({ ...prev, targetRole: e.target.value }))}>
              <MenuItem value="all">{t('notifications.all')}</MenuItem>
              <MenuItem value="customer">{t('notifications.customers')}</MenuItem>
              <MenuItem value="vendor">{t('notifications.vendors')}</MenuItem>
              <MenuItem value="admin">{t('notifications.admins')}</MenuItem>
            </TextField>
            <TextField label={t('notifications.deepLink')} fullWidth value={form.deepLink} onChange={(e) => setForm((prev) => ({ ...prev, deepLink: e.target.value }))} />
            <TextField select label={t('common.status')} fullWidth value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <MenuItem value="draft">{t('announcements.drafts')}</MenuItem>
              <MenuItem value="sent">{t('notifications.sendNow')}</MenuItem>
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
