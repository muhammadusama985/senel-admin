import React, { useEffect, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography, MenuItem, Select, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { useTranslation } from 'react-i18next';

interface BulkOffer {
  _id: string;
  productSnapshot?: { title?: string };
  vendorSnapshot?: { storeName?: string };
  buyerSnapshot?: { email?: string; companyName?: string };
  currentQty: number;
  currentUnitPrice: number;
  currency: string;
  status: string;
  validUntil: string;
  createdAt?: string;
  paymentLink?: { usedAt?: string; orderId?: string };
  orderId?: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  requested: 'info',
  countered: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
  cancelled: 'default',
};

const BulkOffersMonitor: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bulk-offers', status, search],
    queryFn: async () => {
      const r = await api.get('/bulk-offers/admin', {
        params: { status: status || undefined, limit: 200 },
      });
      return r.data as { items: BulkOffer[]; total: number };
    },
  });

  const rows = (data?.items || []).filter((o) =>
    search
      ? `${o.productSnapshot?.title || ''} ${o.vendorSnapshot?.storeName || ''} ${o.buyerSnapshot?.email || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true
  );

  const columns: GridColDef[] = [
    { field: 'product', headerName: 'Product', flex: 1.2, valueGetter: (p: any) => p.row.productSnapshot?.title || '-' },
    { field: 'vendor', headerName: 'Vendor', flex: 1, valueGetter: (p: any) => p.row.vendorSnapshot?.storeName || '-' },
    { field: 'buyer', headerName: 'Buyer', flex: 1, valueGetter: (p: any) => p.row.buyerSnapshot?.companyName || p.row.buyerSnapshot?.email || '-' },
    {
      field: 'terms',
      headerName: 'Terms',
      flex: 1.2,
      valueGetter: (p: any) => `${p.row.currentQty} @ ${p.row.currentUnitPrice} ${p.row.currency}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p: any) => (
        <Chip label={p.row.status} color={statusColors[p.row.status] || 'default'} size="small" />
      ),
    },
    {
      field: 'validUntil',
      headerName: 'Valid Until',
      width: 170,
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '-'),
    },
    {
      field: 'paymentLink',
      headerName: 'Payment Link',
      width: 140,
      renderCell: (p: any) =>
        p.row.paymentLink?.usedAt ? (
          <Chip label="Paid" color="success" size="small" />
        ) : p.row.paymentLink?.token ? (
          <Chip label="Link Issued" color="warning" size="small" />
        ) : (
          <Chip label="—" size="small" />
        ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 160,
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '-'),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Bulk Offers & Negotiations</Typography>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search product / vendor / buyer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 320 }}
        />
        <Select
          size="small"
          displayEmpty
          value={status}
          onChange={(e) => setStatus(e.target.value as string)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="requested">Requested</MenuItem>
          <MenuItem value="countered">Countered</MenuItem>
          <MenuItem value="accepted">Accepted</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
      </Stack>

      <Paper sx={{ height: 'calc(100vh - 240px)', minHeight: 500 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
};

export default BulkOffersMonitor;