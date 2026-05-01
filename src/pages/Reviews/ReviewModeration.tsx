import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const ReviewModeration: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [status, setStatus] = useState('approved');
  const [note, setNote] = useState('');

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: async () => {
      const response = await api.get('/admin/reviews');
      return response.data.items || [];
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/reviews/${selectedReview._id}/moderate`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      setSelectedReview(null);
      setNote('');
    },
  });

  const translateReviewStatus = (value?: string) => {
    const map: Record<string, string> = {
      approved: t('reviews.approved'),
      rejected: t('reviews.rejected'),
      hidden: t('reviews.hidden'),
    };
    return value ? (map[value] || value) : '';
  };

  const columns: GridColDef[] = [
    { field: 'title', headerName: t('reviews.reviewTitle'), minWidth: 200, flex: 1 },
    { field: 'rating', headerName: t('reviews.rating'), minWidth: 100, flex: 0.5 },
    { field: 'status', headerName: t('common.status'), minWidth: 130, flex: 0.7, valueGetter: (_value, row) => translateReviewStatus(row.status) },
    { field: 'productId', headerName: t('reviews.product'), minWidth: 170, flex: 1 },
    { field: 'vendorId', headerName: t('common.vendor'), minWidth: 170, flex: 1 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <Button size="small" variant="outlined" onClick={() => setSelectedReview(params.row)}>
          {t('reviews.moderate')}
        </Button>
      ),
    },
  ];

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4">{t('reviews.title')}</Typography>
        <Typography variant="body1" color="text.secondary">
          {t('reviews.intro')}
        </Typography>

        {error && <Alert severity="error">{t('reviews.failedLoad')}</Alert>}

        <div style={{ height: 620 }}>
          <DataGrid rows={data} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </div>
      </Stack>

      <Dialog open={Boolean(selectedReview)} onClose={() => setSelectedReview(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('reviews.dialogTitle')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField select label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)} fullWidth>
              <MenuItem value="approved">{t('reviews.approved')}</MenuItem>
              <MenuItem value="rejected">{t('reviews.rejected')}</MenuItem>
              <MenuItem value="hidden">{t('reviews.hidden')}</MenuItem>
            </TextField>
            <TextField
              label={t('reviews.note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReview(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => moderateMutation.mutate()} disabled={moderateMutation.isPending}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ReviewModeration;
