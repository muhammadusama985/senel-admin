import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

type HandoverStatus = 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'delivered';

const nextStatusOptions: Record<HandoverStatus, HandoverStatus[]> = {
  ready_for_pickup: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
};

const Handover: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pickupForm, setPickupForm] = useState({
    scheduledAt: '',
    pickupWindow: '',
    notes: '',
  });
  const [statusForm, setStatusForm] = useState({
    status: 'picked_up',
    note: '',
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
  });

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'handover', currentLanguage, 'ready-for-pickup'],
    queryFn: async () => {
      const response = await api.get('/admin/handover/ready-for-pickup');
      return response.data.items || [];
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      await api.post(`/admin/handover/vendor-orders/${selectedOrder._id}/schedule-pickup`, pickupForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'handover'] });
      setPickupDialogOpen(false);
      setSelectedOrder(null);
      setPickupForm({ scheduledAt: '', pickupWindow: '', notes: '' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      await api.post(`/admin/handover/vendor-orders/${selectedOrder._id}/status`, {
        status: statusForm.status,
        note: statusForm.note || undefined,
        tracking: statusForm.carrier || statusForm.trackingNumber || statusForm.trackingUrl
          ? {
              carrier: statusForm.carrier || undefined,
              trackingNumber: statusForm.trackingNumber || undefined,
              trackingUrl: statusForm.trackingUrl || undefined,
            }
          : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'handover'] });
      setStatusDialogOpen(false);
      setSelectedOrder(null);
      setStatusForm({
        status: 'picked_up',
        note: '',
        carrier: '',
        trackingNumber: '',
        trackingUrl: '',
      });
    },
  });

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'vendorOrderNumber', headerName: 'Vendor Order', minWidth: 180, flex: 1 },
      { field: 'vendorId', headerName: t('common.vendor'), minWidth: 160, flex: 1 },
      { field: 'orderId', headerName: t('common.orderNumber'), minWidth: 160, flex: 1 },
      {
        field: 'readyForPickupAt',
        headerName: t('shipping.readySince'),
        minWidth: 170,
        flex: 1,
        valueFormatter: (value) => (value ? format(new Date(value), 'MMM dd, yyyy HH:mm') : '-'),
      },
      {
        field: 'handoverStatus',
        headerName: t('common.status'),
        minWidth: 150,
        flex: 0.8,
        renderCell: (params) => {
          const value = String(params.value || '');
          const labels: Record<string, string> = {
            ready_for_pickup: t('shipping.readyForPickup'),
            picked_up: t('shipping.pickedUp'),
            in_transit: t('shipping.inTransit'),
            delivered: t('shipping.delivered'),
          };
          return <Chip size="small" label={labels[value] || value.replace(/_/g, ' ')} />;
        },
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        minWidth: 260,
        sortable: false,
        renderCell: (params) => {
          const currentStatus = (params.row.handoverStatus || 'ready_for_pickup') as HandoverStatus;
          return (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSelectedOrder(params.row);
                  setPickupDialogOpen(true);
                }}
              >
                {t('shipping.schedulePickup')}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={nextStatusOptions[currentStatus].length === 0}
                onClick={() => {
                  setSelectedOrder(params.row);
                  setStatusForm((prev) => ({
                    ...prev,
                    status: nextStatusOptions[currentStatus][0] || 'picked_up',
                  }));
                  setStatusDialogOpen(true);
                }}
              >
                {t('shipping.updateStatus')}
              </Button>
            </Stack>
          );
        },
      },
    ],
    [t]
  );

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">{t('shipping.title')}</Typography>
          <Typography variant="body1" color="text.secondary">
            {t('shipping.handoverIntro')}
          </Typography>
        </Box>

        {error && <Alert severity="error">{t('shipping.failedLoadOrders')}</Alert>}

        <div style={{ height: 620 }}>
          <DataGrid
            rows={data}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </Stack>

      <Dialog open={pickupDialogOpen} onClose={() => setPickupDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('shipping.schedulePickup')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label={t('shipping.pickupDate')}
              type="datetime-local"
              value={pickupForm.scheduledAt}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label={t('shipping.pickupWindow')}
              value={pickupForm.pickupWindow}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, pickupWindow: e.target.value }))}
              fullWidth
            />
            <TextField
              label={t('shipping.notes')}
              value={pickupForm.notes}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickupDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={!pickupForm.scheduledAt || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('shipping.updateStatus')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              select
              label={t('common.status')}
              value={statusForm.status}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
              fullWidth
            >
              {selectedOrder &&
                nextStatusOptions[(selectedOrder.handoverStatus || 'ready_for_pickup') as HandoverStatus].map((option) => (
                  <MenuItem key={option} value={option}>
                    {{
                      picked_up: t('shipping.pickedUp'),
                      in_transit: t('shipping.inTransit'),
                      delivered: t('shipping.delivered'),
                    }[option] || option.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label={t('shipping.notes')}
              value={statusForm.note}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, note: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label={t('shipping.carrier')}
              value={statusForm.carrier}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, carrier: e.target.value }))}
              fullWidth
            />
            <TextField
              label={t('shipping.trackingNumber')}
              value={statusForm.trackingNumber}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
              fullWidth
            />
            <TextField
              label={t('shipping.trackingUrl')}
              value={statusForm.trackingUrl}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, trackingUrl: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Handover;
