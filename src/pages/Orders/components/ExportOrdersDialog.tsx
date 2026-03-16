import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  LinearProgress,
  Alert,
  useMediaQuery,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Search,
  LocalShipping,
  Schedule,
  Refresh,
  Visibility,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../../api/client';
import { useTheme } from '../../../context/ThemeContext';
import SchedulePickupDialog from '../components/SchedulePickupDialog';
import AssignShippingDialog from '../components/AssignShippingDialog';

const BRAND_BG = `
  radial-gradient(900px 280px at 18% -10%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, rgba(13,26,99,0) 70%),
  linear-gradient(135deg, #0D1A63 0%, #16267a 45%, #0D1A63 100%)
`;
const ACCENT = '#FFD23F';
const BORDER_DARK = 'rgba(255,255,255,0.15)';
const HEADER_DARK = 'rgba(255,255,255,0.12)';
const HOVER_DARK = 'rgba(255,210,63,0.14)';

const PickupQueue: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isDark = mode !== 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'pickup-queue'],
    queryFn: async () => {
      const response = await api.get('/admin/vendor-orders/queue/ready-pickup');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const filteredOrders = data?.items?.filter((order: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.vendorOrderNumber?.toLowerCase().includes(searchLower) ||
      order.vendorStoreName?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedOrders = filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const headerRowSx = {
    backgroundColor: isDark ? HEADER_DARK : '#f5f5f5',
    '& .MuiTableCell-root': {
      ...(isDark && { color: '#fff', fontWeight: 700, borderBottom: `1px solid ${BORDER_DARK}` }),
    },
  };

  const bodyCellSx = {
    ...(isDark && { color: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${BORDER_DARK}` }),
  };

  const rowSx = {
    '&:hover': { backgroundColor: isDark ? HOVER_DARK : '#fff6cc' },
  };

  const searchFieldSx = {
    width: isMobile ? '100%' : 300,
    ...(isDark && {
      '& .MuiOutlinedInput-root': {
        color: '#fff',
        background: 'rgba(255,255,255,0.06)',
        '& fieldset': { borderColor: BORDER_DARK },
        '&:hover fieldset': { borderColor: ACCENT },
      },
    }),
  };

  const handleSchedule = (order: any) => {
    setSelectedOrder(order);
    setScheduleDialogOpen(true);
  };

  const handleAssign = (order: any) => {
    setSelectedOrder(order);
    setAssignDialogOpen(true);
  };

  const handleView = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  if (isLoading) return <LinearProgress />;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        ...(isDark && { background: BRAND_BG, border: `1px solid ${BORDER_DARK}` }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography
          variant="h4"
          sx={{ color: isDark ? '#fff' : '#1C0770', fontSize: isMobile ? '1.5rem' : '2rem' }}
        >
          Pickup Queue
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: isDark ? '#fff' : 'inherit' }} />
                </InputAdornment>
              ),
            }}
            sx={searchFieldSx}
          />

          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} sx={{ color: isDark ? ACCENT : 'primary.main' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {filteredOrders.length === 0 ? (
        <Alert severity="info">No orders ready for pickup</Alert>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{
              background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
              border: isDark ? `1px solid ${BORDER_DARK}` : '1px solid #e2e8f0',
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={headerRowSx}>
                  <TableCell>Order #</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Boxes</TableCell>
                  <TableCell>Dimensions</TableCell>
                  <TableCell>Ready Since</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.map((order: any) => (
                  <TableRow key={order._id} hover sx={rowSx}>
                    <TableCell sx={bodyCellSx}>
                      <Typography variant="body2" fontWeight={700}>
                        {order.vendorOrderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>{order.vendorStoreName}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Chip
                        label={`${order.shippingPrep?.boxCount || 1} boxes`}
                        size="small"
                        sx={{
                          ...(isDark && {
                            color: '#fff',
                            borderColor: BORDER_DARK,
                            background: 'rgba(255,255,255,0.06)',
                          }),
                        }}
                        variant={isDark ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      {order.shippingPrep?.lengthCm ? (
                        <>
                          {order.shippingPrep.lengthCm}×{order.shippingPrep.widthCm}×
                          {order.shippingPrep.heightCm} cm
                          <br />
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary' }}>
                            {order.shippingPrep.weightKg} kg
                          </Typography>
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      {format(new Date(order.readyForPickupAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell align="center" sx={bodyCellSx}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="Schedule Pickup">
                          <IconButton
                            size="small"
                            onClick={() => handleSchedule(order)}
                            sx={{ color: isDark ? ACCENT : 'primary.main' }}
                          >
                            <Schedule />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Assign Shipping">
                          <IconButton
                            size="small"
                            onClick={() => handleAssign(order)}
                            sx={{ color: isDark ? '#fff' : 'inherit' }}
                          >
                            <LocalShipping />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleView(order.orderId)}
                            sx={{ color: isDark ? '#fff' : 'inherit' }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
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
            count={filteredOrders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              mt: 1,
              ...(isDark && {
                color: '#fff',
                '& .MuiTablePagination-selectIcon': { color: '#fff' },
                '& .MuiTablePagination-actions button': { color: '#fff' },
              }),
            }}
          />
        </>
      )}

      <SchedulePickupDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        order={selectedOrder}
        onSuccess={() => {
          setScheduleDialogOpen(false);
          refetch();
        }}
      />

      <AssignShippingDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        order={selectedOrder}
        onSuccess={() => {
          setAssignDialogOpen(false);
          refetch();
        }}
      />
    </Box>
  );
};

export default PickupQueue;