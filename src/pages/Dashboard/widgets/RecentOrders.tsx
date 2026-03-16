import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';

type StatusColor = 'info' | 'warning' | 'primary' | 'success' | 'error' | 'default';

const RecentOrders: React.FC = () => {
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.14);
  const tableHeader = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: async () => {
      const response = await api.get('/admin/orders?limit=5');
      return response.data.items || [];
    },
    refetchInterval: 10000,
  });

  const getStatusColor = (status: string): StatusColor => {
    switch (status?.toLowerCase()) {
      case 'placed':
        return 'info';
      case 'processing':
        return 'warning';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    try {
      return (
        new Date(date).toLocaleDateString() +
        ' ' +
        new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number) => `EUR ${amount?.toFixed(2) || '0.00'}`;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={30} sx={{ color: muiTheme.palette.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading orders</Alert>;
  }

  if (!orders || orders.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography sx={{ color: muiTheme.palette.text.secondary }}>No recent orders</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
      <Table size={isMobile ? 'small' : 'medium'}>
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
            <TableCell>Order #</TableCell>
            {!isMobile && <TableCell>Customer</TableCell>}
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="center">Action</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {orders.map((order: any) => (
            <TableRow key={order._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
              <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                <Typography variant="body2" fontWeight={600}>
                  {order.orderNumber || 'N/A'}
                </Typography>
              </TableCell>

              {!isMobile && (
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  {order.customerName || order.customerUserId?.email || 'N/A'}
                </TableCell>
              )}

              <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                <Typography fontWeight={700}>{formatCurrency(order.grandTotal)}</Typography>
              </TableCell>

              <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                <Chip label={order.status || 'unknown'} size="small" color={getStatusColor(order.status)} sx={{ textTransform: 'capitalize' }} />
              </TableCell>

              <TableCell sx={{ color: muiTheme.palette.text.secondary, borderBottom: `1px solid ${border}` }}>
                <Typography variant="caption">{formatDate(order.createdAt)}</Typography>
              </TableCell>

              <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                <IconButton
                  size="small"
                  onClick={() => navigate(`/orders/${order._id}`)}
                  sx={{ color: muiTheme.palette.text.primary, '&:hover': { backgroundColor: hover } }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentOrders;
