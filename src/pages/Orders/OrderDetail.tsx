import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  IconButton,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import ReactDOMServer from 'react-dom/server';
import {
  ArrowBack,
  LocalShipping,
  CheckCircle,
  Cancel,
  Pending,
  Payment,
  Receipt,
  Inventory,
  Person,
  LocationOn,
  Phone,
  Email,
  Print,
  Schedule,
  ContentCopy,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import OrderReceiptPrint from './OrderReceiptPrint';
import SchedulePickupDialog from './components/SchedulePickupDialog';
import AssignShippingDialog from './components/AssignShippingDialog';
import { formatMoney } from '../../utils/currency';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width:600px)');
  const muiTheme = useMuiTheme();
  const isLight = muiTheme.palette.mode === 'light';
  const DARK_BLUE = muiTheme.palette.background.paper;
  const ACCENT = muiTheme.palette.secondary.main;
  const BORDER = muiTheme.palette.divider;
  const HOVER = alpha(muiTheme.palette.primary.main, isLight ? 0.08 : 0.16);
  const TABLE_HEADER = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);
  const TEXT_PRIMARY = muiTheme.palette.text.primary;
  const TEXT_SECONDARY = muiTheme.palette.text.secondary;

  const [tabValue, setTabValue] = useState(0);
  const [shippingDialog, setShippingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [selectedVendorOrder, setSelectedVendorOrder] = useState<any>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVendorOrderForAction, setSelectedVendorOrderForAction] = useState<any>(null);
  const [refundNote, setRefundNote] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consistent styling for both themes
  const shellSx = {
    p: 2,
    borderRadius: 3,
    backgroundColor: DARK_BLUE,
    border: `1px solid ${BORDER}`,
  };

  const paperSx = {
    p: 3,
    backgroundColor: DARK_BLUE,
    border: `1px solid ${BORDER}`,
  };

  const cardSx = {
    backgroundColor: DARK_BLUE,
    border: `1px solid ${BORDER}`,
  };

  const headerRowSx = {
    backgroundColor: TABLE_HEADER,
    '& .MuiTableCell-root': {
      color: TEXT_PRIMARY,
      fontWeight: 700,
      borderBottom: `1px solid ${BORDER}`,
    },
  };

  const bodyCellSx = {
    color: TEXT_PRIMARY,
    borderBottom: `1px solid ${BORDER}`,
  };

  const rowSx = {
    '&:hover': {
      backgroundColor: HOVER,
    },
  };

  const outlinedBtnSx = {
    color: TEXT_PRIMARY,
    borderColor: BORDER,
    '&:hover': { backgroundColor: HOVER, borderColor: ACCENT },
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: TEXT_PRIMARY,
      backgroundColor: DARK_BLUE,
      '& fieldset': { borderColor: BORDER },
      '&:hover fieldset': { borderColor: ACCENT },
      '&.Mui-focused fieldset': { borderColor: ACCENT },
    },
    '& .MuiInputLabel-root': { color: TEXT_SECONDARY },
    '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
  };

  const dialogSx = {
    '& .MuiDialog-paper': {
      backgroundColor: DARK_BLUE,
      border: `1px solid ${BORDER}`,
    },
  };

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const response = await api.get(`/admin/orders/${id}`);
      return response.data;
    },
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ vendorOrderId, status, data }: any) => {
      if (status === 'picking') {
        await api.post(`/admin/vendor-orders/${vendorOrderId}/start-picking`);
      } else if (status === 'packed') {
        await api.post(`/admin/vendor-orders/${vendorOrderId}/pack`);
      } else if (status === 'shipped') {
        await api.post(`/admin/vendor-orders/${vendorOrderId}/mark-shipped`, data);
      } else if (status === 'delivered') {
        await api.post(`/admin/vendor-orders/${vendorOrderId}/mark-delivered`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setStatusDialog(false);
      setShippingDialog(false);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => api.post(`/admin/orders/${id}/cancel`, { note: 'Cancelled by admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setActionMessage({ type: 'success', text: 'Order cancelled successfully.' });
    },
    onError: (error: any) => {
      setActionMessage({ type: 'error', text: error.response?.data?.message || 'Failed to cancel order.' });
    },
  });

  const markRefundedMutation = useMutation({
    mutationFn: async () => api.post(`/admin/orders/${id}/mark-refunded`, { note: refundNote.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setRefundNote('');
      setActionMessage({ type: 'success', text: 'Order marked as refunded successfully.' });
    },
    onError: (error: any) => {
      setActionMessage({ type: 'error', text: error.response?.data?.message || 'Failed to mark order refunded.' });
    },
  });

  const handlePrint = () => {
    if (!order) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt #${order.order?.orderNumber}</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: 'Roboto', Arial, sans-serif;
              background: #ffffff;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <div id="print-content"></div>
        </body>
      </html>
    `);

      printWindow.document.close();

      const printContent = ReactDOMServer.renderToString(<OrderReceiptPrint order={order} />);
      const printElement = printWindow.document.getElementById('print-content');
      if (printElement) {
        printElement.innerHTML = printContent;
      }

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleSchedulePickup = (vendorOrder: any) => {
    setSelectedVendorOrderForAction(vendorOrder);
    setScheduleDialogOpen(true);
  };

  const handleAssignShipping = (vendorOrder: any) => {
    setSelectedVendorOrderForAction(vendorOrder);
    setAssignDialogOpen(true);
  };

  const copyToClipboard = async (value?: string, label?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setActionMessage({ type: 'success', text: `${label || 'Value'} copied.` });
    } catch {
      setActionMessage({ type: 'error', text: `Could not copy ${label || 'value'}.` });
    }
  };

  if (isLoading) return <LinearProgress sx={{ backgroundColor: BORDER, '& .MuiLinearProgress-bar': { backgroundColor: ACCENT } }} />;
  
  if (error || !order) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          m: 2, 
          backgroundColor: DARK_BLUE, 
          color: TEXT_PRIMARY,
          border: `1px solid ${BORDER}`,
          '& .MuiAlert-icon': { color: TEXT_PRIMARY }
        }}
      >
        Order not found or error loading data.
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
      placed: 'info',
      picking: 'info',
      accepted: 'primary',
      packed: 'warning',
      ready_pickup: 'warning',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const handleStatusUpdate = (vendorOrderId: string, status: string) => {
    setSelectedVendorOrder(vendorOrderId);
    setNewStatus(status);
    if (status === 'shipped') {
      setShippingDialog(true);
    } else {
      setStatusDialog(true);
    }
  };

  const confirmStatusUpdate = () => {
    if (selectedVendorOrder && newStatus) {
      const data: any = {};
      if (newStatus === 'shipped') {
        data.shippedAt = new Date().toISOString();
        data.partnerName = carrier;
        data.trackingCode = trackingNumber;
      } else if (newStatus === 'delivered') {
        data.deliveredAt = new Date().toISOString();
      }
      updateStatusMutation.mutate({
        vendorOrderId: selectedVendorOrder,
        status: newStatus,
        data,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'shipped': return <LocalShipping sx={{ color: ACCENT }} />;
      case 'cancelled': return <Cancel sx={{ color: '#f44336' }} />;
      case 'placed': return <Receipt sx={{ color: '#2196f3' }} />;
      case 'picking': return <Inventory sx={{ color: ACCENT }} />;
      default: return <Pending sx={{ color: '#ff9800' }} />;
    }
  };

  const orderCurrency = order.order?.currency || order.items?.[0]?.currency || 'EUR';
  const refundRequest = order.order?.refundRequest;
  const showMarkRefundedButton =
    order.order?.status === 'cancelled' &&
    order.order?.paymentStatus === 'paid' &&
    refundRequest?.status === 'requested';

  return (
    <Box sx={shellSx}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <IconButton
          onClick={() => navigate('/orders')}
          sx={{
            mr: 1,
            color: TEXT_PRIMARY,
            '&:hover': { backgroundColor: HOVER },
          }}
        >
          <ArrowBack />
        </IconButton>

        <Typography
          variant="h4"
          sx={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: TEXT_PRIMARY,
            flex: 1,
          }}
        >
          Order #{order.order?.orderNumber}
        </Typography>

        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={handlePrint}
       sx={{
  background: 'linear-gradient(90deg, #5B2EFF 0%, #8A2BE2 50%, #FF6A00 100%)',
  color: '#ffffff',
  border: 'none',
  '&:hover': {
    background: 'linear-gradient(90deg, #4a25d9 0%, #7a22c9 50%, #e85f00 100%)',
  },
  '&:disabled': {
    background: 'linear-gradient(90deg, rgba(91,46,255,0.5) 0%, rgba(138,43,226,0.5) 50%, rgba(255,106,0,0.5) 100%)',
    color: alpha(TEXT_PRIMARY, 0.6),
  }
}}
        >
          Print
        </Button>
        {order.order?.status !== 'cancelled' && (
          <Button variant="contained" color="error" onClick={() => cancelOrderMutation.mutate()} disabled={cancelOrderMutation.isPending}>
            {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        )}
        {showMarkRefundedButton && (
          <Button
            variant="contained"
            color="success"
            onClick={() => markRefundedMutation.mutate()}
            disabled={markRefundedMutation.isPending}
          >
            {markRefundedMutation.isPending ? 'Marking Refunded...' : 'Mark Refunded'}
          </Button>
        )}
      </Box>

      {actionMessage && (
        <Alert
          severity={actionMessage.type}
          sx={{
            mb: 3,
            backgroundColor: DARK_BLUE,
            color: TEXT_PRIMARY,
            border: `1px solid ${BORDER}`,
            '& .MuiAlert-icon': { color: actionMessage.type === 'success' ? '#4caf50' : '#f44336' },
          }}
          onClose={() => setActionMessage(null)}
        >
          {actionMessage.text}
        </Alert>
      )}

      {/* Order Summary Card */}
      <Paper sx={{ px: 3, mb: 3, ...paperSx }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>
              Order Date
            </Typography>
            <Typography variant="body1" sx={{ color: TEXT_PRIMARY }}>
              {format(new Date(order.order.createdAt), 'PPP')}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>
              Total Amount
            </Typography>
            <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 800 }}>
              {formatMoney(Number(order.order.grandTotal || 0), orderCurrency)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>
              Payment Method
            </Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize', color: TEXT_PRIMARY }}>
              {order.order.paymentMethod}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>
              Payment Status
            </Typography>
            <Chip
              label={order.order.paymentStatus}
              color={order.order.paymentStatus === 'paid' ? 'success' : 'warning'}
              size="small"
              sx={{
                borderColor: BORDER,
                color: TEXT_PRIMARY,
                backgroundColor: order.order.paymentStatus === 'paid' ? '#2e7d32' : '#ed6c02',
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {refundRequest?.status && refundRequest.status !== 'none' && (
        <Paper sx={{ mb: 3, ...paperSx }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 800 }}>
                Refund Request Details
              </Typography>
              <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
                Review the requested bank details before completing the refund for this cancelled order.
              </Typography>
            </Box>
            <Chip
              label={refundRequest.status}
              color={refundRequest.status === 'refunded' ? 'success' : refundRequest.status === 'requested' ? 'warning' : 'default'}
              sx={{ textTransform: 'capitalize' }}
            />
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>Order Total</Typography>
              <Typography variant="body1" sx={{ color: TEXT_PRIMARY, fontWeight: 700 }}>
                {formatMoney(Number(order.order.grandTotal || 0), orderCurrency)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>Refund Requested At</Typography>
              <Typography variant="body1" sx={{ color: TEXT_PRIMARY }}>
                {refundRequest.requestedAt ? format(new Date(refundRequest.requestedAt), 'PPp') : '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY }}>Processed At</Typography>
              <Typography variant="body1" sx={{ color: TEXT_PRIMARY }}>
                {refundRequest.processedAt ? format(new Date(refundRequest.processedAt), 'PPp') : '-'}
              </Typography>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {[
              ['Account Holder', refundRequest.accountHolderName, 'Account holder'],
              ['Bank Name', refundRequest.bankName, 'Bank name'],
              ['Account Number', refundRequest.accountNumber, 'Account number'],
              ['IBAN', refundRequest.iban, 'IBAN'],
              ['SWIFT / BIC', refundRequest.swiftCode, 'SWIFT / BIC'],
              ['Country', refundRequest.country, 'Country'],
            ].map(([label, value, copyLabel]) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={String(label)}>
                <Card sx={cardSx}>
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY, mb: 0.5 }}>{label}</Typography>
                      <Typography variant="body1" sx={{ color: TEXT_PRIMARY, wordBreak: 'break-word' }}>
                        {value || '-'}
                      </Typography>
                    </Box>
                    {value ? (
                      <IconButton
                        size="small"
                        onClick={() => void copyToClipboard(String(value), String(copyLabel))}
                        sx={{ color: TEXT_PRIMARY, border: `1px solid ${BORDER}` }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {refundRequest.notes ? (
              <Grid size={{ xs: 12 }}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: TEXT_SECONDARY, mb: 0.5 }}>Customer Notes</Typography>
                    <Typography variant="body1" sx={{ color: TEXT_PRIMARY }}>{refundRequest.notes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}
            {showMarkRefundedButton && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Admin refund note (optional)"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Reference, transfer note, or internal remark"
                  sx={fieldSx}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%', mb: 3, ...paperSx }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : undefined}
          sx={{
            borderBottom: 1,
            borderColor: BORDER,
            '& .MuiTab-root': { color: TEXT_SECONDARY, fontWeight: 700 },
            '& .MuiTab-root.Mui-selected': { color: ACCENT },
            '& .MuiTabs-indicator': { backgroundColor: ACCENT },
          }}
        >
          <Tab label="Vendor Orders" />
          <Tab label="Customer Info" />
          <Tab label="Timeline" />
        </Tabs>

        {/* Vendor Orders Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {order.vendorOrders?.map((vendorOrder: any) => (
              <Grid size={{ xs: 12 }} key={vendorOrder._id}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ color: ACCENT, fontWeight: 800 }}>
                          {vendorOrder.vendorStoreName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: TEXT_SECONDARY }}
                        >
                          Vendor Order #{vendorOrder.vendorOrderNumber}
                        </Typography>
                      </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          size="small"
                          label={(vendorOrder.fulfillmentType || 'vendor').toUpperCase()}
                          color={(vendorOrder.fulfillmentType || 'vendor') === 'admin' ? 'secondary' : 'default'}
                          sx={{ color: TEXT_PRIMARY }}
                        />

                        <Chip
                          icon={getStatusIcon(vendorOrder.status)}
                          label={vendorOrder.status.replace('_', ' ')}
                          color={getStatusColor(vendorOrder.status)}
                          size="small"
                          sx={{
                            borderColor: BORDER,
                            color: TEXT_PRIMARY,
                          }}
                        />

                        {(vendorOrder.fulfillmentType || 'vendor') === 'vendor' && vendorOrder.status === 'ready_pickup' && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Schedule />}
                              onClick={() => handleSchedulePickup(vendorOrder)}
                              sx={outlinedBtnSx}
                            >
                              Schedule
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<LocalShipping />}
                              onClick={() => handleAssignShipping(vendorOrder)}
                              sx={outlinedBtnSx}
                            >
                              Assign
                            </Button>
                          </>
                        )}

                        {(vendorOrder.fulfillmentType || 'vendor') === 'vendor' && vendorOrder.status === 'ready_pickup' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleStatusUpdate(vendorOrder._id, 'shipped')}
                            sx={{
                              backgroundColor: ACCENT,
                              color: DARK_BLUE,
                              '&:hover': { backgroundColor: '#e6b92e' },
                            }}
                          >
                            Mark Shipped
                          </Button>
                        )}

                        {(vendorOrder.fulfillmentType || 'vendor') === 'admin' && vendorOrder.status === 'placed' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleStatusUpdate(vendorOrder._id, 'picking')}
                            sx={outlinedBtnSx}
                          >
                            Start Picking
                          </Button>
                        )}

                        {(vendorOrder.fulfillmentType || 'vendor') === 'admin' &&
                          (vendorOrder.status === 'placed' || vendorOrder.status === 'picking') && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleStatusUpdate(vendorOrder._id, 'packed')}
                              sx={outlinedBtnSx}
                            >
                              Pack
                            </Button>
                        )}

                        {(vendorOrder.fulfillmentType || 'vendor') === 'admin' && vendorOrder.status === 'packed' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleStatusUpdate(vendorOrder._id, 'shipped')}
                            sx={{
                              backgroundColor: ACCENT,
                              color: DARK_BLUE,
                              '&:hover': { backgroundColor: '#e6b92e' },
                            }}
                          >
                            Mark Shipped
                          </Button>
                        )}

                        {vendorOrder.status === 'shipped' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleStatusUpdate(vendorOrder._id, 'delivered')}
                            sx={{ color: TEXT_PRIMARY }}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={{
                            backgroundColor: DARK_BLUE,
                            borderColor: BORDER,
                          }}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={headerRowSx}>
                                <TableCell>Product</TableCell>
                                <TableCell align="right">Qty</TableCell>
                                <TableCell align="right">Unit Price</TableCell>
                                <TableCell align="right">Total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {order.items
                                ?.filter((item: any) => item.vendorOrderId === vendorOrder._id)
                                .map((item: any) => (
                                  <TableRow key={item._id} sx={rowSx}>
                                    <TableCell sx={bodyCellSx}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                          src={item.imageUrl}
                                          variant="rounded"
                                          sx={{
                                            width: 30,
                                            height: 30,
                                            border: `1px solid ${BORDER}`,
                                            bgcolor: DARK_BLUE,
                                          }}
                                        >
                                          <Inventory />
                                        </Avatar>
                                        <Typography variant="body2" sx={{ color: TEXT_PRIMARY }}>
                                          {item.title}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right" sx={bodyCellSx}>{item.qty}</TableCell>
                                    <TableCell align="right" sx={bodyCellSx}>€{item.unitPrice?.toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={bodyCellSx}>€{item.lineTotal?.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>

                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card variant="outlined" sx={cardSx}>
                          <CardContent>
                            <Typography
                              variant="subtitle2"
                              gutterBottom
                              sx={{ color: TEXT_PRIMARY }}
                            >
                              Shipping Information
                            </Typography>

                            {vendorOrder.shippingPrep && (
                              <>
                                <Typography variant="body2" sx={{ color: TEXT_PRIMARY }}>
                                  Boxes: {vendorOrder.shippingPrep.boxCount || 1}
                                </Typography>
                                <Typography variant="body2" sx={{ color: TEXT_PRIMARY }}>
                                  Weight: {vendorOrder.shippingPrep.weightKg || 0} kg
                                </Typography>
                                <Typography variant="body2" sx={{ color: TEXT_PRIMARY }}>
                                  Dimensions: {vendorOrder.shippingPrep.lengthCm || 0} x{' '}
                                  {vendorOrder.shippingPrep.widthCm || 0} x{' '}
                                  {vendorOrder.shippingPrep.heightCm || 0} cm
                                </Typography>
                              </>
                            )}

                            {vendorOrder.shipping && (
                              <>
                                <Divider sx={{ my: 1, borderColor: BORDER }} />

                                <Typography
                                  variant="subtitle2"
                                  gutterBottom
                                  sx={{ color: TEXT_PRIMARY }}
                                >
                                  Tracking
                                </Typography>

                                <Typography variant="body2" sx={{ color: TEXT_PRIMARY }}>
                                  Carrier: {vendorOrder.shipping.partnerName || 'Not assigned'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: TEXT_PRIMARY }}>
                                  Tracking: {vendorOrder.shipping.trackingCode || 'N/A'}
                                </Typography>

                                {vendorOrder.shipping.shippedAt && (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: TEXT_SECONDARY }}
                                  >
                                    Shipped: {format(new Date(vendorOrder.shipping.shippedAt), 'PPP')}
                                  </Typography>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Customer Info Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: ACCENT, fontWeight: 800 }}>
                    Customer Information
                  </Typography>
                  <List
                    sx={{
                      '& .MuiListItemIcon-root': { color: TEXT_PRIMARY },
                      '& .MuiListItemText-primary': { color: TEXT_PRIMARY },
                      '& .MuiListItemText-secondary': { color: TEXT_SECONDARY },
                    }}
                  >
                    <ListItem>
                      <ListItemIcon>
                        <Person />
                      </ListItemIcon>
                      <ListItemText
                        primary="Name"
                        secondary={order.order.shippingAddress?.contactPerson || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Email />
                      </ListItemIcon>
                      <ListItemText
                        primary="Email"
                        secondary={order.order.customerUserId?.email || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Phone />
                      </ListItemIcon>
                      <ListItemText
                        primary="Phone"
                        secondary={order.order.shippingAddress?.mobileNumber || 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: ACCENT, fontWeight: 800 }}>
                    Shipping Address
                  </Typography>
                  <List
                    sx={{
                      '& .MuiListItemIcon-root': { color: TEXT_PRIMARY },
                      '& .MuiListItemText-primary': { color: TEXT_PRIMARY },
                      '& .MuiListItemText-secondary': { color: TEXT_SECONDARY },
                    }}
                  >
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn />
                      </ListItemIcon>
                      <ListItemText
                        primary="Address"
                        secondary={
                          <>
                            {order.order.shippingAddress?.companyName && (
                              <>{order.order.shippingAddress.companyName}<br /></>
                            )}
                            {order.order.shippingAddress?.street}<br />
                            {order.order.shippingAddress?.city}, {order.order.shippingAddress?.country}
                          </>
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={tabValue} index={2}>
          <Timeline
            position={isMobile ? 'right' : 'alternate'}
            sx={{
              '& .MuiTimelineOppositeContent-root': { color: TEXT_SECONDARY },
              '& .MuiTimelineContent-root': { color: TEXT_PRIMARY },
            }}
          >
            <TimelineItem>
              <TimelineOppositeContent color="textSecondary">
                {format(new Date(order.order.createdAt), 'PPp')}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color="info">
                  <Receipt />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="h6">Order Placed</Typography>
                <Typography>Order #{order.order.orderNumber} was created</Typography>
              </TimelineContent>
            </TimelineItem>

            {order.order.paymentStatus === 'paid' && (
              <TimelineItem>
                <TimelineOppositeContent color="textSecondary">
                  {format(new Date(order.order.updatedAt), 'PPp')}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="success">
                    <Payment />
                  </TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6">Payment Received</Typography>
                  <Typography>Payment confirmed via {order.order.paymentMethod}</Typography>
                </TimelineContent>
              </TimelineItem>
            )}

            {order.vendorOrders?.map((vendorOrder: any, index: number) => (
              <React.Fragment key={vendorOrder._id}>
                {vendorOrder.status === 'shipped' && (
                  <TimelineItem>
                    <TimelineOppositeContent color="textSecondary">
                      {format(new Date(vendorOrder.shipping?.shippedAt), 'PPp')}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot sx={{ backgroundColor: ACCENT }}>
                        <LocalShipping />
                      </TimelineDot>
                      {index < order.vendorOrders.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="h6">Order Shipped</Typography>
                      <Typography>
                        {vendorOrder.vendorStoreName} - {vendorOrder.shipping?.partnerName}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                )}

                {vendorOrder.status === 'delivered' && (
                  <TimelineItem>
                    <TimelineOppositeContent color="textSecondary">
                      {format(new Date(vendorOrder.shipping?.deliveredAt), 'PPp')}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color="success">
                        <CheckCircle />
                      </TimelineDot>
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="h6">Order Delivered</Typography>
                      <Typography>{vendorOrder.vendorStoreName}</Typography>
                    </TimelineContent>
                  </TimelineItem>
                )}
              </React.Fragment>
            ))}
          </Timeline>
        </TabPanel>
      </Paper>

      {/* Shipping Dialog */}
      <Dialog open={shippingDialog} onClose={() => setShippingDialog(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ color: TEXT_PRIMARY }}>
          Mark as Shipped
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Carrier"
              fullWidth
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g., DHL, FedEx, UPS"
              sx={fieldSx}
            />
            <TextField
              label="Tracking Number"
              fullWidth
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              sx={fieldSx}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShippingDialog(false)}
            sx={{ color: TEXT_PRIMARY, '&:hover': { backgroundColor: HOVER } }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmStatusUpdate}
            variant="contained"
            disabled={!carrier.trim() || !trackingNumber.trim() || updateStatusMutation.isPending}
            sx={{
              backgroundColor: ACCENT,
              color: DARK_BLUE,
              '&:hover': { backgroundColor: '#e6b92e' },
            }}
          >
            {updateStatusMutation.isPending ? <CircularProgress size={24} sx={{ color: DARK_BLUE }} /> : 'Confirm Shipment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Confirmation Dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} sx={dialogSx}>
        <DialogTitle sx={{ color: TEXT_PRIMARY }}>
          Confirm Status Update
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: TEXT_PRIMARY }}>
            Are you sure you want to mark this order as {newStatus}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setStatusDialog(false)}
            sx={{ color: TEXT_PRIMARY, '&:hover': { backgroundColor: HOVER } }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmStatusUpdate}
            variant="contained"
            color={newStatus === 'delivered' ? 'success' : 'primary'}
            disabled={updateStatusMutation.isPending}
            sx={{ color: '#ffffff' }}
          >
            {updateStatusMutation.isPending ? <CircularProgress size={24} sx={{ color: '#ffffff' }} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Pickup Dialog */}
      <SchedulePickupDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        order={selectedVendorOrderForAction}
        onSuccess={() => {
          setScheduleDialogOpen(false);
          refetch();
        }}
      />

      {/* Assign Shipping Dialog */}
      <AssignShippingDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        order={selectedVendorOrderForAction}
        onSuccess={() => {
          setAssignDialogOpen(false);
          refetch();
        }}
      />
    </Box>
  );
};

export default OrderDetail;
