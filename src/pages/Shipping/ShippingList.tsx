import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { CheckCircle, Search } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface Props {
  status: 'shipped' | 'delivered';
}

const ShippingList: React.FC<Props> = ({ status }) => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const hover = alpha(muiTheme.palette.primary.main, 0.06);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shipping', status],
    queryFn: async () => {
      const response = await api.get(`/admin/vendor-orders?status=${status}`);
      return {
        items: response.data.items || [],
        total: response.data.items?.length || 0,
      };
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post(`/admin/vendor-orders/${orderId}/mark-delivered`, {
        deliveredAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    },
  });

  const filteredOrders = React.useMemo(() => {
    if (!data?.items) return [];
    if (!search) return data.items;
    const needle = search.toLowerCase();
    return data.items.filter((order: any) =>
      order.vendorOrderNumber?.toLowerCase().includes(needle) ||
      order.vendorStoreName?.toLowerCase().includes(needle) ||
      order.shipping?.trackingCode?.toLowerCase().includes(needle)
    );
  }, [data, search]);

  const paginatedOrders = React.useMemo(() => {
    const start = page * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, page, rowsPerPage]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentStatusLabel = status === 'shipped' ? t('shipping.inTransit') : t('shipping.delivered');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
        {t('shipping.failedLoadOrders')}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder={t('shipping.searchOrders')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: textSecondary }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 300,
            '& .MuiOutlinedInput-root': {
              color: textPrimary,
              backgroundColor: surface,
              '& fieldset': { borderColor: border },
            },
            '& input::placeholder': { color: textSecondary, opacity: 1 },
          }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: alpha(textPrimary, 0.04),
                '& th': {
                  color: textPrimary,
                  fontWeight: 700,
                  borderBottom: `1px solid ${border}`,
                },
              }}
            >
              <TableCell>{t('shipping.orderNumber')}</TableCell>
              <TableCell>{t('shipping.vendor')}</TableCell>
              <TableCell>{t('shipping.carrier')}</TableCell>
              <TableCell>{t('shipping.trackingNumber')}</TableCell>
              <TableCell>{status === 'shipped' ? t('shipping.shippedAt') : t('shipping.deliveredAtLabel')}</TableCell>
              {status === 'shipped' && <TableCell align="center">{t('common.actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedOrders.map((order: any) => (
              <TableRow key={order._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                  <Typography fontWeight={500}>{order.vendorOrderNumber}</Typography>
                </TableCell>
                <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{order.vendorStoreName}</TableCell>
                <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                  {order.shipping?.partnerName || <Typography variant="caption" sx={{ color: textSecondary }}>{t('shipping.notAssigned')}</Typography>}
                </TableCell>
                <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                  {order.shipping?.trackingCode || '-'}
                </TableCell>
                <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                  {formatDate(status === 'shipped' ? order.shipping?.shippedAt : order.shipping?.deliveredAt)}
                </TableCell>
                {status === 'shipped' && (
                  <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        await markDeliveredMutation.mutateAsync(order._id);
                        refetch();
                      }}
                      sx={{ color: muiTheme.palette.success.main }}
                      title={t('shipping.markAsDelivered')}
                    >
                      <CheckCircle />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {paginatedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={status === 'shipped' ? 6 : 5} align="center" sx={{ py: 4, color: textSecondary }}>
                  {t('shipping.noStatusOrders', { status: currentStatusLabel })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredOrders.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        sx={{
          color: textPrimary,
          '& .MuiSvgIcon-root': { color: textPrimary },
          '& .MuiInputBase-root': { color: textPrimary },
        }}
      />
    </Box>
  );
};

export default ShippingList;
