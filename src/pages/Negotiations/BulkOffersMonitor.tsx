import React, { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
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
  paymentLink?: { token?: string; usedAt?: string; orderId?: string };
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

const formatDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const BulkOffersMonitor: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data, isLoading, error } = useQuery({
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

  // v8-compatible DataGrid columns:
  // valueGetter/valueFormatter/renderCell use (value, row) or (params) signature.
  const columns: GridColDef<BulkOffer>[] = [
    {
      field: 'productTitle',
      headerName: 'Product',
      flex: 1.2,
      valueGetter: (_value, row) => row?.productSnapshot?.title || '-',
    },
    {
      field: 'vendorName',
      headerName: 'Vendor',
      flex: 1,
      valueGetter: (_value, row) => row?.vendorSnapshot?.storeName || '-',
    },
    {
      field: 'buyerLabel',
      headerName: 'Buyer',
      flex: 1,
      valueGetter: (_value, row) =>
        row?.buyerSnapshot?.companyName || row?.buyerSnapshot?.email || '-',
    },
    {
      field: 'terms',
      headerName: 'Terms',
      flex: 1.2,
      valueGetter: (_value, row) =>
        row ? `${row.currentQty} @ ${row.currentUnitPrice} ${row.currency}` : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const status = (params.row?.status as string) || '';
        return (
          <Chip label={status} color={statusColors[status] || 'default'} size="small" />
        );
      },
    },
    {
      field: 'validUntil',
      headerName: 'Valid Until',
      width: 170,
      valueGetter: (_value, row) => formatDate(row?.validUntil),
    },
    {
      field: 'paymentLink',
      headerName: 'Payment Link',
      width: 140,
      renderCell: (params) => {
        const link = params.row?.paymentLink;
        if (link?.usedAt) return <Chip label="Paid" color="success" size="small" />;
        if (link?.token) return <Chip label="Link Issued" color="warning" size="small" />;
        return <Chip label="—" size="small" />;
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 160,
      valueGetter: (_value, row) => formatDate(row?.createdAt),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Bulk Offers & Negotiations</Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load bulk offers.
        </Alert>
      ) : null}

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
        <DataGrid<BulkOffer>
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
};

export default BulkOffersMonitor;