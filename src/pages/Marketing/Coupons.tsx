import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface Coupon {
  _id: string;
  code: string;
  scope: 'global' | 'vendor';
  vendorId?: string | null;
  discountType: 'percent' | 'fixed';
  value: number;
  minSubtotal?: number;
  maxDiscount?: number;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  usedCount?: number;
}

interface Vendor {
  _id: string;
  storeName: string;
}

const initialForm = {
  code: '',
  scope: 'global',
  vendorId: '',
  discountType: 'percent',
  value: 0,
  minSubtotal: 0,
  maxDiscount: 0,
  usageLimitTotal: 0,
  usageLimitPerUser: 0,
  startsAt: '',
  endsAt: '',
  isActive: true,
};

const toInputDateTime = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 16) : '');

const Coupons: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const response = await api.get('/admin/coupons');
      return Array.isArray(response.data?.items) ? response.data.items : [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['admin', 'vendors', 'coupon-options'],
    queryFn: async () => {
      const response = await api.get('/vendors/admin/vendors');
      return Array.isArray(response.data?.vendors) ? response.data.vendors : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        vendorId: form.scope === 'vendor' ? form.vendorId || null : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };

      if (editing?._id) {
        await api.patch(`/admin/coupons/${editing._id}`, payload);
      } else {
        await api.post('/admin/coupons', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setOpen(false);
      setEditing(null);
      setForm(initialForm);
      setError('');
    },
    onError: (mutationError: any) => {
      setError(mutationError.response?.data?.message || 'Failed to save coupon');
    },
  });

  const vendorNameMap = useMemo(() => {
    const entries = vendors.map((vendor: Vendor) => [vendor._id, vendor.storeName]);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [vendors]);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'code', headerName: t('coupons.code'), minWidth: 140, flex: 1 },
      {
        field: 'scope',
        headerName: t('coupons.scope'),
        minWidth: 120,
        valueFormatter: (value) => (value === 'vendor' ? t('coupons.vendorCoupon') : t('coupons.globalCoupon')),
      },
      {
        field: 'vendorId',
        headerName: t('coupons.vendor'),
        minWidth: 180,
        flex: 1,
        valueGetter: (_value, row) => row.vendorId ? vendorNameMap[row.vendorId] || row.vendorId : '-',
      },
      {
        field: 'discountType',
        headerName: t('coupons.discountType'),
        minWidth: 140,
        valueFormatter: (value) => (value === 'fixed' ? t('coupons.fixed') : t('coupons.percent')),
      },
      { field: 'value', headerName: t('coupons.value'), minWidth: 100 },
      { field: 'usedCount', headerName: 'Used', minWidth: 90 },
      {
        field: 'isActive',
        headerName: t('common.status'),
        minWidth: 100,
        valueFormatter: (value) => (value ? 'Active' : 'Inactive'),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        minWidth: 140,
        sortable: false,
        renderCell: (params) => (
          <Button
            size="small"
            onClick={() => {
              const coupon = params.row as Coupon;
              setEditing(coupon);
              setForm({
                code: coupon.code || '',
                scope: coupon.scope || 'global',
                vendorId: coupon.vendorId || '',
                discountType: coupon.discountType || 'percent',
                value: coupon.value || 0,
                minSubtotal: coupon.minSubtotal || 0,
                maxDiscount: coupon.maxDiscount || 0,
                usageLimitTotal: coupon.usageLimitTotal || 0,
                usageLimitPerUser: coupon.usageLimitPerUser || 0,
                startsAt: toInputDateTime(coupon.startsAt),
                endsAt: toInputDateTime(coupon.endsAt),
                isActive: coupon.isActive ?? true,
              });
              setError('');
              setOpen(true);
            }}
          >
            {t('common.edit')}
          </Button>
        ),
      },
    ],
    [t, vendorNameMap]
  );

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4">{t('coupons.title')}</Typography>
            <Typography variant="body1" color="text.secondary">
              {t('coupons.intro')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => {
              setEditing(null);
              setForm(initialForm);
              setError('');
              setOpen(true);
            }}
          >
            {t('coupons.newCoupon')}
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ height: 620 }}>
          <DataGrid rows={coupons} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </Box>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `${t('common.edit')} ${t('coupons.title')}` : `${t('common.create')} ${t('coupons.title')}`}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('coupons.code')}
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              />
              <TextField
                select
                fullWidth
                label={t('coupons.scope')}
                value={form.scope}
                onChange={(e) => setForm((prev) => ({ ...prev, scope: e.target.value as 'global' | 'vendor', vendorId: e.target.value === 'vendor' ? prev.vendorId : '' }))}
              >
                <MenuItem value="global">{t('coupons.globalCoupon')}</MenuItem>
                <MenuItem value="vendor">{t('coupons.vendorCoupon')}</MenuItem>
              </TextField>
            </Stack>

            {form.scope === 'vendor' && (
              <TextField
                select
                fullWidth
                label={t('coupons.vendor')}
                value={form.vendorId}
                onChange={(e) => setForm((prev) => ({ ...prev, vendorId: e.target.value }))}
              >
                {vendors.map((vendor: Vendor) => (
                  <MenuItem key={vendor._id} value={vendor._id}>
                    {vendor.storeName}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                label={t('coupons.discountType')}
                value={form.discountType}
                onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as 'percent' | 'fixed' }))}
              >
                <MenuItem value="percent">{t('coupons.percent')}</MenuItem>
                <MenuItem value="fixed">{t('coupons.fixed')}</MenuItem>
              </TextField>
              <TextField
                type="number"
                fullWidth
                label={t('coupons.value')}
                value={form.value}
                onChange={(e) => setForm((prev) => ({ ...prev, value: Number(e.target.value) }))}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                type="number"
                fullWidth
                label={t('coupons.minSubtotal')}
                value={form.minSubtotal}
                onChange={(e) => setForm((prev) => ({ ...prev, minSubtotal: Number(e.target.value) }))}
              />
              <TextField
                type="number"
                fullWidth
                label={t('coupons.maxDiscount')}
                value={form.maxDiscount}
                onChange={(e) => setForm((prev) => ({ ...prev, maxDiscount: Number(e.target.value) }))}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                type="number"
                fullWidth
                label={t('coupons.usageLimitTotal')}
                value={form.usageLimitTotal}
                onChange={(e) => setForm((prev) => ({ ...prev, usageLimitTotal: Number(e.target.value) }))}
              />
              <TextField
                type="number"
                fullWidth
                label={t('coupons.usageLimitPerUser')}
                value={form.usageLimitPerUser}
                onChange={(e) => setForm((prev) => ({ ...prev, usageLimitPerUser: Number(e.target.value) }))}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                type="datetime-local"
                fullWidth
                label={t('coupons.startsAt')}
                value={form.startsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="datetime-local"
                fullWidth
                label={t('coupons.endsAt')}
                value={form.endsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Switch checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              <Typography>{t('coupons.active')}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.code.trim() || (form.scope === 'vendor' && !form.vendorId)}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Coupons;
