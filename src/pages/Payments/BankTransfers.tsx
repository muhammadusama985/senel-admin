import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../api/client';

const BankTransfers: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<'under_review' | 'awaiting_transfer' | 'rejected' | 'paid'>('under_review');

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'bank-transfers', statusFilter],
    queryFn: async () => {
      const response = await api.get(`/admin/bank-transfers?status=${statusFilter}`);
      return response.data.items || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      if (action === 'approve') {
        await api.post(`/admin/bank-transfers/${selectedOrder._id}/approve`, { note });
      } else {
        await api.post(`/admin/bank-transfers/${selectedOrder._id}/reject`, { reason: note || 'Rejected by admin' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bank-transfers'] });
      setSelectedOrder(null);
      setNote('');
    },
  });

  const resolveProofUrl = (row: any): string => {
    const rawUrl = row?.bankTransfer?.proofUrl || row?.proofUrl || '';
    if (!rawUrl) return '';
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    const apiBase = String(api.defaults.baseURL || 'http://localhost:4000/api/v1');
    const origin = apiBase.replace(/\/api\/v1\/?$/, '');
    return `${origin}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
  };

  const translateTransferStatus = (status?: string) => {
    const map: Record<string, string> = {
      under_review: t('payments.underReview'),
      awaiting_transfer: t('payments.awaitingTransfer'),
      rejected: t('reviews.rejected'),
      paid: t('payments.paid'),
    };
    return status ? (map[status] || status) : '';
  };

  const columns: GridColDef[] = [
    { field: 'orderNumber', headerName: t('common.orderNumber'), minWidth: 180, flex: 1 },
    {
      field: 'paymentStatus',
      headerName: t('payments.paymentStatus'),
      minWidth: 140,
      flex: 0.8,
      valueGetter: (_value, row) => translateTransferStatus(row.paymentStatus),
    },
    { field: 'grandTotal', headerName: t('payments.grandTotal'), minWidth: 130, flex: 0.7 },
    {
      field: 'shippingStatus',
      headerName: t('payments.shippingStatus'),
      minWidth: 130,
      flex: 0.8,
      valueGetter: (_value, row) => row.shippingStatus ? row.shippingStatus : '',
    },
    {
      field: 'proof',
      headerName: t('payments.proof'),
      minWidth: 130,
      sortable: false,
      renderCell: (params) => {
        const proofUrl = resolveProofUrl(params.row);
        return (
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            disabled={!proofUrl}
            onClick={() => {
              if (proofUrl) window.open(proofUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            {t('payments.viewProof')}
          </Button>
        );
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={params.row.paymentStatus !== 'under_review'}
            onClick={() => { setSelectedOrder(params.row); setAction('approve'); }}
          >
            {t('payments.approve')}
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={params.row.paymentStatus !== 'under_review'}
            onClick={() => { setSelectedOrder(params.row); setAction('reject'); }}
          >
            {t('payments.reject')}
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4">{t('payments.bankTransfersTitle')}</Typography>
        <Typography variant="body1" color="text.secondary">
          {t('payments.bankTransfersIntro')}
        </Typography>
        <TextField
          select
          label={t('payments.paymentStatus')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          sx={{ maxWidth: 280 }}
        >
          <MenuItem value="under_review">{t('payments.underReview')}</MenuItem>
          <MenuItem value="awaiting_transfer">{t('payments.awaitingTransfer')}</MenuItem>
          <MenuItem value="rejected">{t('reviews.rejected')}</MenuItem>
          <MenuItem value="paid">{t('payments.paid')}</MenuItem>
        </TextField>
        {statusFilter !== 'under_review' && (
          <Alert severity="info">
            {t('payments.approveRejectOnlyUnderReview')}
          </Alert>
        )}

        {error && <Alert severity="error">{t('payments.failedLoadQueue')}</Alert>}

        <div style={{ height: 620 }}>
          <DataGrid rows={data} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </div>
      </Stack>

      <Dialog open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} fullWidth maxWidth="sm">
        <DialogTitle>{action === 'approve' ? t('payments.approveDialog') : t('payments.rejectDialog')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label={action === 'approve' ? t('payments.approvalNote') : t('payments.rejectionReason')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color={action === 'approve' ? 'primary' : 'error'} onClick={() => mutation.mutate()}>
            {t('common.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BankTransfers;
