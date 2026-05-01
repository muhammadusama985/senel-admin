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
import { Cancel, Refresh, Search, Visibility } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { formatMoney } from '../../utils/currency';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const hover = alpha(muiTheme.palette.primary.main, muiTheme.palette.mode === 'light' ? 0.06 : 0.14);
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: textPrimary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: muiTheme.palette.primary.main },
    },
    '& .MuiInputAdornment-root': { color: textSecondary },
    '& input::placeholder': { color: textSecondary, opacity: 1 },
  };

  const selectSx = {
    color: textPrimary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: muiTheme.palette.primary.main,
    },
    '& .MuiSvgIcon-root': { color: textPrimary },
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'orders', currentLanguage, page, rowsPerPage, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search && { q: search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const response = await api.get(`/admin/orders?${params}`);
      return response.data;
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => api.post(`/admin/orders/${orderId}/cancel`, { note: 'Cancelled by admin from order list' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
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
      cancelled: 'error',
    };

    return (
      <Chip
        label={status.replace('_', ' ')}
        size="small"
        color={colors[status] || 'default'}
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  if (isLoading) {
    return (
      <LinearProgress
        sx={{
          backgroundColor: alpha(textPrimary, muiTheme.palette.mode === 'light' ? 0.08 : 0.18),
          '& .MuiLinearProgress-bar': { backgroundColor: muiTheme.palette.primary.main },
        }}
      />
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ color: textPrimary, fontSize: isMobile ? '1.5rem' : '2rem' }}>
          {t('orders.title')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('orders.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: isMobile ? '100%' : 260, ...fieldSx }}
          />

          <Tooltip title={t('orders.refresh')}>
            <IconButton onClick={() => refetch()} sx={{ color: muiTheme.palette.primary.main, '&:hover': { backgroundColor: hover } }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('orders.orderStatus')}</InputLabel>
            <Select value={statusFilter} label={t('orders.orderStatus')} onChange={(event) => setStatusFilter(event.target.value)} sx={selectSx}>
              <MenuItem value="all">{t('orders.allStatuses')}</MenuItem>
              <MenuItem value="placed">{t('orders.placed')}</MenuItem>
              <MenuItem value="cancelled">{t('orders.cancelled')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {data?.items?.length === 0 ? (
        <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
          {t('orders.noOrders')}
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: alpha(textPrimary, muiTheme.palette.mode === 'light' ? 0.04 : 0.08),
                    '& .MuiTableCell-root': {
                      color: textPrimary,
                      fontWeight: 700,
                      borderBottom: `1px solid ${border}`,
                    },
                  }}
                >
                  <TableCell>{t('orders.order')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('orders.payment')}</TableCell>
                  <TableCell>{t('orders.shipping')}</TableCell>
                  <TableCell>{t('orders.amount')}</TableCell>
                  <TableCell>{t('common.date')}</TableCell>
                  <TableCell align="center">{t('orders.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items?.map((order: any) => (
                  <TableRow key={order._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                    <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                      <Typography variant="body2" fontWeight={700}>
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${border}` }}>{getStatusChip(order.status)}</TableCell>
                    <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                      {order.paymentStatus || t('products.notAvailable')}
                    </TableCell>
                    <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                      {order.shippingStatus || t('products.notAvailable')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                      <Typography fontWeight={800} sx={{ color: accent }}>
                        {formatMoney(Number(order.grandTotal || 0), order.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                      {formatOrderDate(order.createdAt)}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title={t('orders.viewDetails')}>
                          <IconButton size="small" onClick={() => navigate(`/orders/${order._id}`)} sx={{ '&:hover': { backgroundColor: hover } }}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>

                        {order.status !== 'cancelled' && !order.allVendorOrdersDelivered && (
                          <Tooltip title={t('orders.cancelOrder')}>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={cancelOrderMutation.isPending}
                              onClick={() => cancelOrderMutation.mutate(order._id)}
                              sx={{ '&:hover': { backgroundColor: alpha(muiTheme.palette.error.main, 0.12) } }}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
              color: textSecondary,
              '& .MuiTablePagination-selectIcon': { color: textSecondary },
              '& .MuiTablePagination-actions button': { color: textPrimary },
            }}
          />
        </>
      )}
    </Box>
  );
};

export default OrderList;
