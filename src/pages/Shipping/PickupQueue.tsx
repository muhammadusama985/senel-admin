import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
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
import { CheckCircle, LocalShipping, MoreVert, Schedule, Search } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import SchedulePickupModal from './SchedulePickupModal';
import AssignShippingModal from './AssignShippingModal';

const PickupQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const hover = alpha(muiTheme.palette.primary.main, 0.06);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shipping', 'ready-pickup'],
    queryFn: async () => {
      const response = await api.get('/admin/vendor-orders/queue/ready-pickup');
      return {
        items: response.data.items || [],
        total: response.data.items?.length || 0,
      };
    },
  });

  const markShippedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post(`/admin/vendor-orders/${orderId}/mark-shipped`, {
        shippedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
      handleMenuClose();
      refetch();
    },
  });

  const filteredOrders = React.useMemo(() => {
    if (!data?.items) return [];
    if (!search) return data.items;
    const needle = search.toLowerCase();
    return data.items.filter((order: any) =>
      order.vendorOrderNumber?.toLowerCase().includes(needle) ||
      order.vendorStoreName?.toLowerCase().includes(needle)
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

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const translatePickupStatus = (status?: string) => {
    if (!status) return t('shipping.readyPickup');

    const normalized = String(status).toLowerCase().replace(/[\s-]+/g, '_');
    const statusKeyMap: Record<string, string> = {
      ready_pickup: 'shipping.readyPickup',
      in_transit: 'shipping.inTransit',
      delivered: 'shipping.delivered',
      shipped: 'shipping.markShipped',
    };

    const translationKey = statusKeyMap[normalized];
    return translationKey ? t(translationKey) : status;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        }
      >
        {t('shipping.errorPickupQueue')}
      </Alert>
    );
  }

  return (
    <Box className="page-shell" sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start' }}>
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
              <TableCell>{t('shipping.order')}</TableCell>
              <TableCell>{t('shipping.vendor')}</TableCell>
              <TableCell>{t('shipping.boxes')}</TableCell>
              <TableCell>{t('shipping.readySince')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell align="center">{t('shipping.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: textSecondary }}>
                  {t('shipping.noOrders')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order: any) => (
                <TableRow key={order._id} sx={{ '&:hover': { backgroundColor: hover } }}>
                  <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                    <Typography variant="body2" fontWeight={700}>{order.vendorOrderNumber}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                    <Typography variant="body2">{order.vendorStoreName}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                    <Chip label={order.boxCount || 0} size="small" />
                  </TableCell>
                  <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                    <Typography variant="caption" sx={{ color: textSecondary }}>
                      {formatDate(order.readyForPickupAt)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                    <Chip label={translatePickupStatus(order.status)} size="small" color="warning" />
                  </TableCell>
                  <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedOrder(order);
                      }}
                      sx={{ color: textPrimary }}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
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
          '& .MuiTablePagination-selectIcon': { color: textPrimary },
          '& .MuiTablePagination-actions button': { color: textPrimary },
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <MenuItem onClick={() => { setScheduleModalOpen(true); setAnchorEl(null); }} sx={{ color: textPrimary }}>
          <Schedule sx={{ mr: 1, fontSize: 20, color: textSecondary }} /> {t('shipping.schedulePickup')}
        </MenuItem>
        <MenuItem onClick={() => { setAssignModalOpen(true); setAnchorEl(null); }} sx={{ color: textPrimary }}>
          <LocalShipping sx={{ mr: 1, fontSize: 20, color: textSecondary }} /> {t('shipping.assignShipping')}
        </MenuItem>
        <MenuItem
          sx={{ color: textPrimary }}
          onClick={async () => {
            if (selectedOrder) {
              await markShippedMutation.mutateAsync(selectedOrder._id);
            }
          }}
        >
          <CheckCircle sx={{ mr: 1, fontSize: 20, color: textSecondary }} /> {t('shipping.markShipped')}
        </MenuItem>
      </Menu>

      <SchedulePickupModal
        open={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={() => {
          setScheduleModalOpen(false);
          setSelectedOrder(null);
          refetch();
        }}
      />

      <AssignShippingModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={() => {
          setAssignModalOpen(false);
          setSelectedOrder(null);
          refetch();
        }}
      />
    </Box>
  );
};

export default PickupQueue;
