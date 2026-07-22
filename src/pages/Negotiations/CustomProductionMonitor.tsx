import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useTranslation } from 'react-i18next';

interface RFQ {
  _id: string;
  productSnapshot?: { title?: string };
  vendorSnapshot?: { storeName?: string };
  buyerSnapshot?: { email?: string; companyName?: string };
  qty: number;
  status: string;
  validUntil: string;
  createdAt?: string;
  quotation?: { unitPrice: number; totalPrice?: number; currency: string };
  paymentLink?: { token?: string; usedAt?: string; orderId?: string };
  orderId?: string;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  requested: 'info',
  quoted: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'default',
  cancelled: 'default',
  in_production: 'primary',
  completed: 'success',
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const CustomProductionMonitor: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'custom-production', status, search],
    queryFn: async () => {
      const r = await api.get('/custom-production/admin', {
        params: { status: status || undefined, limit: 200 },
      });
      return r.data as { items: RFQ[]; total: number };
    },
  });

  const rows = (data?.items || []).filter((r) =>
    search
      ? `${r.productSnapshot?.title || ''} ${r.vendorSnapshot?.storeName || ''} ${r.buyerSnapshot?.email || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true
  );

  const columns: GridColDef<RFQ>[] = [
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
    { field: 'qty', headerName: 'Qty', width: 90 },
    {
      field: 'quotation',
      headerName: 'Quotation',
      flex: 1,
      valueGetter: (_value, row) =>
        row?.quotation
          ? `${row.quotation.unitPrice} ${row.quotation.currency} / unit (total ${row.quotation.totalPrice})`
          : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const status = (params.row?.status as string) || '';
        return (
          <Chip label={status} color={statusColors[status] || 'default'} size="small" />
        );
      },
    },
    {
      field: 'paymentLink',
      headerName: 'Payment / Order',
      width: 160,
      renderCell: (params) => {
        const link = params.row?.paymentLink;
        if (link?.usedAt) return <Chip label="Paid" color="success" size="small" />;
        if (params.row?.orderId) return <Chip label="Order Created" color="primary" size="small" />;
        if (link?.token) return <Chip label="Link Issued" color="warning" size="small" />;
        return <Chip label="—" size="small" />;
      },
    },
    {
      field: 'validUntil',
      headerName: 'Valid Until',
      width: 170,
      valueGetter: (_value, row) => formatDate(row?.validUntil),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 160,
      valueGetter: (_value, row) => formatDate(row?.createdAt),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<RFQ>) => {
        const id = params.row?._id;
        if (!id) return null;
        return (
          <Tooltip title="Delete this request">
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm('Delete this custom production request? This also removes it from the vendor\'s negotiation list.')) {
                    deleteMutation.mutate(id);
                  }
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
  ];

  // Admin-only hard delete: removes the request from the system so it
  // disappears from the vendor's negotiation list as well. The vendor can
  // only respond / counter / accept / reject; only the admin can delete.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/custom-production/admin/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'custom-production'] });
      queryClient.removeQueries({ queryKey: ['admin', 'custom-production', id] });
    },
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Custom Production Requests</Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load custom production requests.
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
          <MenuItem value="quoted">Quoted</MenuItem>
          <MenuItem value="accepted">Accepted</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="expired">Expired</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
          <MenuItem value="in_production">In Production</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </Select>
      </Stack>

      <Paper sx={{ height: 'calc(100vh - 240px)', minHeight: 500 }}>
        <DataGrid<RFQ>
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

export default CustomProductionMonitor;