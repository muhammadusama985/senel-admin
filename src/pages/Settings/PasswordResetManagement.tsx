import React from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const PasswordResetManagement: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'password-reset-tokens'],
    queryFn: async () => {
      const response = await api.get('/admin/password-reset/tokens');
      return response.data.items || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ tokenId, status }: { tokenId: string; status: string }) => {
      await api.patch(`/admin/password-reset/tokens/${tokenId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'password-reset-tokens'] });
    },
  });

  const columns: GridColDef[] = [
    { field: 'email', headerName: 'Email', minWidth: 220, flex: 1.2 },
    { field: 'status', headerName: t('common.status'), minWidth: 120 },
    { field: 'attempts', headerName: 'Attempts', minWidth: 100 },
    { field: 'resendCount', headerName: 'Resends', minWidth: 100 },
    { field: 'createdAt', headerName: 'Created At', minWidth: 180, flex: 1 },
    { field: 'expiresAt', headerName: 'Expires At', minWidth: 180, flex: 1 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      minWidth: 240,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => updateMutation.mutate({ tokenId: params.row._id, status: 'expired' })}>
            Expire
          </Button>
          <Button size="small" onClick={() => updateMutation.mutate({ tokenId: params.row._id, status: 'locked' })}>
            Lock
          </Button>
          <Button size="small" onClick={() => updateMutation.mutate({ tokenId: params.row._id, status: 'active' })}>
            Activate
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">{t('passwordReset.title')}</Typography>
          <Typography variant="body1" color="text.secondary">
            {t('passwordReset.intro')}
          </Typography>
        </Box>

        {error && <Alert severity="error">Failed to load password reset tokens.</Alert>}

        <Box sx={{ height: 620 }}>
          <DataGrid rows={data} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </Box>
      </Stack>
    </Paper>
  );
};

export default PasswordResetManagement;
