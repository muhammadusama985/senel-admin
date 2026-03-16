import React, { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Refresh, Search, Visibility } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import api from '../../api/client';

const VendorOrderList: React.FC = () => {
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.14);
  const tableHeader = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: muiTheme.palette.primary.main },
    },
    '& .MuiInputLabel-root': { color: muiTheme.palette.text.secondary },
    '& .MuiInputLabel-root.Mui-focused': { color: muiTheme.palette.primary.main },
    '& .MuiInputAdornment-root': { color: muiTheme.palette.text.secondary },
    '& input::placeholder': { color: muiTheme.palette.text.secondary, opacity: 1 },
  };

  const selectSx = {
    color: muiTheme.palette.text.primary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: muiTheme.palette.primary.main,
    },
    '& .MuiSvgIcon-root': { color: muiTheme.palette.text.primary },
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'vendor-orders', page, rowsPerPage, search, statusFilter, vendorFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search && { q: search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        fulfillmentType: 'vendor',
        ...(vendorFilter !== 'all' && { vendorId: vendorFilter }),
      });
      const response = await api.get(`/admin/vendor-orders?${params}`);
      return response.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors', 'list'],
    queryFn: async () => {
      const response = await api.get('/vendors/admin/vendors');
      return Array.isArray(response.data?.vendors) ? response.data.vendors : [];
    },
  });

  const formatOrderDate = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : 'N/A';
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
      placed: 'info',
      accepted: 'primary',
      packed: 'warning',
      picking: 'info',
      ready_pickup: 'warning',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'error',
    };
    return <Chip label={status.replace('_', ' ')} size="small" color={colors[status] || 'default'} sx={{ textTransform: 'capitalize' }} />;
  };

  if (isLoading) {
    return (
      <LinearProgress
        sx={{
          backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.08 : 0.18),
          '& .MuiLinearProgress-bar': { backgroundColor: muiTheme.palette.primary.main },
        }}
      />
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ color: muiTheme.palette.text.primary, fontSize: isMobile ? '1.5rem' : '2rem' }}>
          Vendor Orders
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search orders..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: isMobile ? '100%' : 250, ...fieldSx }}
          />

          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} sx={{ color: muiTheme.palette.primary.main, '&:hover': { backgroundColor: hover } }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Order Status</InputLabel>
            <Select value={statusFilter} label="Order Status" onChange={(event) => setStatusFilter(event.target.value)} sx={selectSx}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="placed">Placed</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="packed">Packed</MenuItem>
              <MenuItem value="ready_pickup">Ready for Pickup</MenuItem>
              <MenuItem value="shipped">Shipped</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Vendor</InputLabel>
            <Select value={vendorFilter} label="Vendor" onChange={(event) => setVendorFilter(event.target.value)} sx={selectSx}>
              <MenuItem value="all">All Vendors</MenuItem>
              {vendors?.map((vendor: any) => (
                <MenuItem key={vendor._id} value={vendor._id}>
                  {vendor.storeName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {data?.items?.length === 0 ? (
        <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
          No vendor orders found
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: tableHeader,
                    '& .MuiTableCell-root': {
                      color: muiTheme.palette.text.primary,
                      fontWeight: 700,
                      borderBottom: `1px solid ${border}`,
                    },
                  }}
                >
                  <TableCell>Vendor Order #</TableCell>
                  <TableCell>Master Order #</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items?.map((order: any) => (
                  <TableRow key={order._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                    <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                      <Typography variant="body2" fontWeight={700}>
                        {order.vendorOrderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                      {order.orderId?.orderNumber || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                      {order.vendorStoreName}
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${border}` }}>{getStatusChip(order.status)}</TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                      <Typography fontWeight={800} sx={{ color: accent }}>
                        EUR {order.grandTotal?.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                      {formatOrderDate(order.createdAt)}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => navigate(`/orders/${order.orderId?._id}`)} sx={{ '&:hover': { backgroundColor: hover } }}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={data?.total || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            sx={{
              mt: 1,
              color: muiTheme.palette.text.secondary,
              '& .MuiTablePagination-selectIcon': { color: muiTheme.palette.text.secondary },
              '& .MuiTablePagination-actions button': { color: muiTheme.palette.text.primary },
            }}
          />
        </>
      )}
    </Box>
  );
};

export default VendorOrderList;
