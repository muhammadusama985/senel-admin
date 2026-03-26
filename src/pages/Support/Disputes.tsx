import React, { useState } from 'react';
import { Paper, Stack, Typography, Alert, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const Disputes: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => {
      const response = await api.get('/admin/disputes');
      return response.data.items || [];
    },
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'disputes', selectedDispute?._id],
    queryFn: async () => {
      const response = await api.get(`/disputes/${selectedDispute._id}`);
      return response.data;
    },
    enabled: Boolean(selectedDispute?._id),
  });

  const replyMutation = useMutation({
    mutationFn: async () => api.post(`/disputes/${selectedDispute._id}/messages`, { message: reply.trim() }),
    onSuccess: async () => {
      setReply('');
      await detailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
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
    { field: 'vendorLabel', headerName: t('common.vendor'), minWidth: 180, flex: 1 },
    { field: 'customerLabel', headerName: t('common.customer'), minWidth: 180, flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <Button size="small" variant="outlined" onClick={() => setSelectedDispute(params.row)}>
          View Conversation
        </Button>
      ),
    },
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

      <Dialog open={Boolean(selectedDispute)} onClose={() => setSelectedDispute(null)} maxWidth="md" fullWidth>
        <DialogTitle>Dispute Conversation</DialogTitle>
        <DialogContent dividers>
          {detailQuery.isLoading ? (
            <Typography>Loading dispute...</Typography>
          ) : detailQuery.data ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{detailQuery.data.dispute.disputeNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailQuery.data.dispute.subject} • {(detailQuery.data.dispute.reason || 'other').replaceAll('_', ' ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {String(detailQuery.data.dispute.status || '').replaceAll('_', ' ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer: {detailQuery.data.dispute.customerLabel || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendor: {detailQuery.data.dispute.vendorLabel || '-'}
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                {(detailQuery.data.messages || []).map((message: any) => (
                  <Paper key={message._id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2">
                      {message.senderRole === 'customer' ? 'Customer' : message.senderRole === 'vendor' ? 'Vendor' : 'Admin'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {message.createdAt ? new Date(message.createdAt).toLocaleString() : '-'}
                    </Typography>
                    <Typography sx={{ mt: 1 }}>{message.message}</Typography>
                  </Paper>
                ))}
              </Stack>

              {detailQuery.data.dispute.status !== 'closed' ? (
                <TextField
                  label="Reply as Admin"
                  multiline
                  rows={4}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
              ) : null}
            </Stack>
          ) : (
            <Alert severity="error">Failed to load dispute details.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDispute(null)}>Close</Button>
          {detailQuery.data?.dispute?.status !== 'closed' ? (
            <Button variant="contained" onClick={() => replyMutation.mutate()} disabled={!reply.trim() || replyMutation.isPending}>
              {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Disputes;
