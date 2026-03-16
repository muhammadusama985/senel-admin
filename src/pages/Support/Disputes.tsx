import React from 'react';
import { Paper, Stack, Typography, Alert, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const Disputes: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => {
      const response = await api.get('/admin/disputes');
      return response.data.items || [];
    },
  });

  const columns: GridColDef[] = [
    { field: 'disputeNumber', headerName: 'Dispute', minWidth: 160, flex: 1 },
    { field: 'subject', headerName: 'Subject', minWidth: 220, flex: 1.4 },
    { field: 'reason', headerName: 'Reason', minWidth: 150, flex: 1 },
    {
      field: 'status',
      headerName: t('common.status'),
      minWidth: 140,
      flex: 0.8,
      renderCell: (params) => <Chip label={String(params.value || '').replace('_', ' ')} size="small" />,
    },
    { field: 'vendorId', headerName: t('common.vendor'), minWidth: 180, flex: 1 },
    { field: 'customerUserId', headerName: t('common.customer'), minWidth: 180, flex: 1 },
  ];

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4">{t('disputes.title')}</Typography>
        <Typography variant="body1" color="text.secondary">
          {t('disputes.intro')}
        </Typography>

        {error && <Alert severity="error">Failed to load disputes.</Alert>}

        <div style={{ height: 620 }}>
          <DataGrid
            rows={data || []}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </Stack>
    </Paper>
  );
};

export default Disputes;
