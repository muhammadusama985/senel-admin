import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import {
  AttachMoney,
  CheckCircle,
  Close,
  ContentCopy,
  Info,
  MoreVert,
  Payment,
  Search,
  Store,
  Visibility,
  Cancel,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface Payout {
  _id: string;
  vendorId: string;
  vendorName?: string;
  amount?: number;
  walletBalance?: number;
  walletCurrency?: string;
  payoutMethod: string;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  createdAt: string;
  externalReference?: string;
  reviewNote?: string;
  rejectionReason?: string;
  paidAt?: string;
  payoutDetails?: Record<string, any>;
}

interface VendorResponse {
  vendor: {
    storeName: string;
  };
}

const vendorNameCache = new Map<string, string>();

const PayoutList: React.FC = () => {
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('requested');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});

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

  const { data: payouts, isLoading, error } = useQuery({
    queryKey: ['admin', 'payouts', page, rowsPerPage, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        status: statusFilter,
        ...(search && { q: search }),
      });
      const response = await api.get(`/admin/payouts?${params}`);
      return response.data;
    },
  });

  useEffect(() => {
    const fetchVendorNames = async () => {
      if (!payouts?.items?.length) return;

      const vendorIds: string[] = Array.from(
        new Set<string>(
          payouts.items
            .map((payout: Payout) => payout.vendorId)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
        ),
      );

      const idsToFetch: string[] = vendorIds.filter((id) => !vendorNameCache.has(id));

      if (idsToFetch.length > 0) {
        const names: Record<string, string> = {};
        await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const response = await api.get<VendorResponse>(`/vendors/admin/vendors/${id}`);
              const vendorName = response.data.vendor?.storeName || 'Unknown Vendor';
              vendorNameCache.set(id, vendorName);
              names[id] = vendorName;
            } catch {
              vendorNameCache.set(id, 'Unknown Vendor');
              names[id] = 'Unknown Vendor';
            }
          }),
        );
        setVendorNames((prev) => ({ ...prev, ...names }));
      }

      const cachedNames: Record<string, string> = {};
      vendorIds.forEach((id) => {
        if (vendorNameCache.has(id)) {
          cachedNames[id] = vendorNameCache.get(id)!;
        }
      });
      setVendorNames((prev) => ({ ...prev, ...cachedNames }));
    };

    fetchVendorNames();
  }, [payouts]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      await api.post(`/admin/payouts/${id}/approve`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      setApproveDialog(false);
      setExternalRef('');
      handleMenuClose();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, reference }: { id: string; reference: string }) => {
      await api.post(`/admin/payouts/${id}/mark-paid`, { externalReference: reference });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      setApproveDialog(false);
      setExternalRef('');
      handleMenuClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/admin/payouts/${id}/reject`, { note: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      setRejectDialog(false);
      handleMenuClose();
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, payout: Payout) => {
    setAnchorEl(event.currentTarget);
    setSelectedPayout(payout);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
      requested: 'warning',
      approved: 'info',
      paid: 'success',
      rejected: 'error',
    };
    return <Chip label={status} size="small" color={colors[status] || 'default'} sx={{ textTransform: 'capitalize' }} />;
  };

  const getVendorName = (vendorId: string) => vendorNames[vendorId] || t('payouts.loadingVendor');

  const formatCurrency = (amount: number | undefined) => `EUR ${amount?.toFixed(2) || '0.00'}`;

  const copyValue = async (value: unknown, label: string) => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
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
      <Alert severity="error" sx={{ m: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
        {t('payouts.errorLoading')}
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: muiTheme.palette.text.primary }}>
          {t('payouts.title')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('payouts.searchVendors')}
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

          <FormControl size="small" sx={{ width: 160 }}>
            <InputLabel>{t('common.status')}</InputLabel>
            <Select value={statusFilter} label={t('common.status')} onChange={(event) => setStatusFilter(event.target.value)} sx={selectSx}>
              <MenuItem value="requested">{t('payouts.requested')}</MenuItem>
              <MenuItem value="approved">{t('products.approved')}</MenuItem>
              <MenuItem value="paid">{t('payouts.markPaid')}</MenuItem>
              <MenuItem value="rejected">{t('products.rejected')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: surface, border: `1px solid ${border}`, overflow: 'hidden' }}>
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
              <TableCell>{t('common.vendor')}</TableCell>
              <TableCell>{t('orders.amount')}</TableCell>
              <TableCell>{t('payouts.method')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('payouts.requested')}</TableCell>
              <TableCell>{t('payouts.reference')}</TableCell>
              <TableCell align="center">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payouts?.items?.map((payout: Payout) => (
              <TableRow key={payout._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(accent, 0.2), color: accent }}>
                      <Store />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                        {getVendorName(payout.vendorId)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                        ID: {payout.vendorId?.substring(0, 8)}...
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                  <Typography fontWeight={800} sx={{ color: accent }}>
                    {formatCurrency(payout.amount)}
                  </Typography>
                </TableCell>

                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}`, textTransform: 'capitalize' }}>
                  {payout.payoutMethod}
                </TableCell>

                <TableCell sx={{ borderBottom: `1px solid ${border}` }}>{getStatusChip(payout.status)}</TableCell>

                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  {format(new Date(payout.createdAt), 'MMM dd, yyyy')}
                </TableCell>

                <TableCell sx={{ color: muiTheme.palette.text.secondary, borderBottom: `1px solid ${border}` }}>
                  <Typography variant="caption">{payout.externalReference || '-'}</Typography>
                </TableCell>

                <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                  <IconButton size="small" onClick={(event) => handleMenuOpen(event, payout)} sx={{ '&:hover': { backgroundColor: hover } }}>
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={payouts?.total || 0}
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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        {selectedPayout && (
          <>
            {selectedPayout.status === 'requested' && (
              <>
                <MenuItem onClick={() => { setViewDialog(true); handleMenuClose(); }}>
                  <Visibility sx={{ mr: 1, fontSize: 20 }} /> {t('payouts.viewDetails')}
                </MenuItem>
                <MenuItem onClick={() => setApproveDialog(true)}>
                  <CheckCircle sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.success.main }} /> {t('products.approve')}
                </MenuItem>
                <MenuItem onClick={() => setRejectDialog(true)}>
                  <Cancel sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.error.main }} /> {t('products.reject')}
                </MenuItem>
              </>
            )}
            {selectedPayout.status === 'approved' && (
              <>
                <MenuItem onClick={() => setApproveDialog(true)}>
                  <Payment sx={{ mr: 1, fontSize: 20, color: accent }} /> {t('payouts.markPaid')}
                </MenuItem>
                <MenuItem onClick={() => setRejectDialog(true)}>
                  <Cancel sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.error.main }} /> {t('products.reject')}
                </MenuItem>
                <MenuItem onClick={() => { setViewDialog(true); handleMenuClose(); }}>
                  <Visibility sx={{ mr: 1, fontSize: 20 }} /> {t('payouts.viewDetails')}
                </MenuItem>
              </>
            )}
            {(selectedPayout.status === 'paid' || selectedPayout.status === 'rejected') && (
              <MenuItem onClick={() => { setViewDialog(true); handleMenuClose(); }}>
                <Visibility sx={{ mr: 1, fontSize: 20 }} /> {t('payouts.viewDetails')}
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>{selectedPayout?.status === 'approved' ? 'Mark as Paid' : 'Approve Payout'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedPayout?.status === 'approved' ? (
              <Box>
                <TextField
                  autoFocus
                  label="External Reference"
                  fullWidth
                  value={externalRef}
                  onChange={(event) => setExternalRef(event.target.value)}
                  placeholder="Bank transaction ID / Reference"
                  helperText="Enter the bank transaction reference"
                  sx={fieldSx}
                  FormHelperTextProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                />
                {selectedPayout?.payoutDetails && Object.keys(selectedPayout.payoutDetails).length > 0 && (
                  <Card variant="outlined" sx={{ mt: 2, backgroundColor: surface, borderColor: border }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: muiTheme.palette.primary.main, fontWeight: 800 }}>
                        Bank Details To Pay
                      </Typography>
                      <Grid container spacing={2}>
                        {Object.entries(selectedPayout.payoutDetails).map(([key, value]) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (text) => text.toUpperCase())}
                                </Typography>
                                <Typography variant="body2" sx={{ color: muiTheme.palette.text.primary, wordBreak: 'break-word' }}>
                                  {String(value || '-')}
                                </Typography>
                              </Box>
                              {value ? (
                                <IconButton size="small" onClick={() => copyValue(value, key)} sx={{ '&:hover': { backgroundColor: hover } }}>
                                  <ContentCopy fontSize="small" />
                                </IconButton>
                              ) : null}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Box>
                <Typography sx={{ color: muiTheme.palette.text.primary, mb: 1.5 }}>
                  Are you sure you want to approve payout of {formatCurrency(selectedPayout?.amount)} for{' '}
                  <strong>{selectedPayout && getVendorName(selectedPayout.vendorId)}</strong>?
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Current Wallet Balance</Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: accent }}>
                          {formatCurrency(selectedPayout?.walletBalance)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Requested Payout</Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: accent }}>
                          {formatCurrency(selectedPayout?.amount)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedPayout?.status === 'approved') {
                if (selectedPayout && externalRef.trim()) {
                  markPaidMutation.mutate({ id: selectedPayout._id, reference: externalRef });
                }
              } else if (selectedPayout) {
                approveMutation.mutate({ id: selectedPayout._id });
              }
            }}
            variant="contained"
            disabled={(selectedPayout?.status === 'approved' && !externalRef.trim()) || approveMutation.isPending || markPaidMutation.isPending}
          >
            {approveMutation.isPending || markPaidMutation.isPending ? <CircularProgress size={20} color="inherit" /> : selectedPayout?.status === 'approved' ? 'Mark Paid' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>Reject Payout Request</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explain why this payout is being rejected..."
            sx={fieldSx}
            FormHelperTextProps={{ sx: { color: muiTheme.palette.text.secondary } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedPayout && rejectReason.trim()) {
                rejectMutation.mutate({ id: selectedPayout._id, reason: rejectReason });
              }
            }}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewDialog} onClose={() => { setViewDialog(false); setSelectedPayout(null); }} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        {selectedPayout && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Payout Details - {getVendorName(selectedPayout.vendorId)}</Typography>
                <IconButton onClick={() => { setViewDialog(false); setSelectedPayout(null); }} sx={{ '&:hover': { backgroundColor: hover } }}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: border }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Payout ID</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>{selectedPayout._id}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Status</Typography>
                          <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedPayout.status)}</Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Requested Date</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                            {format(new Date(selectedPayout.createdAt), 'PPP')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: muiTheme.palette.primary.main, fontWeight: 800 }}>
                        Vendor Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><Store sx={{ fontSize: 20, color: muiTheme.palette.text.secondary }} /></ListItemIcon>
                          <ListItemText primary="Vendor Name" secondary={getVendorName(selectedPayout.vendorId)} primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }} secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }} />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Info sx={{ fontSize: 20, color: muiTheme.palette.text.secondary }} /></ListItemIcon>
                          <ListItemText primary="Vendor ID" secondary={selectedPayout.vendorId} primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }} secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: muiTheme.palette.primary.main, fontWeight: 800 }}>
                        Payment Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><AttachMoney sx={{ fontSize: 20, color: muiTheme.palette.text.secondary }} /></ListItemIcon>
                          <ListItemText
                            primary="Requested Amount"
                            secondary={<Typography fontWeight={800} sx={{ color: accent }}>{formatCurrency(selectedPayout.amount)}</Typography>}
                            primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><AttachMoney sx={{ fontSize: 20, color: muiTheme.palette.text.secondary }} /></ListItemIcon>
                          <ListItemText
                            primary="Current Wallet Balance"
                            secondary={<Typography fontWeight={800} sx={{ color: accent }}>{formatCurrency(selectedPayout.walletBalance)}</Typography>}
                            primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Payment sx={{ fontSize: 20, color: muiTheme.palette.text.secondary }} /></ListItemIcon>
                          <ListItemText primary="Payment Method" secondary={selectedPayout.payoutMethod?.toUpperCase() || 'Bank Transfer'} primaryTypographyProps={{ sx: { color: muiTheme.palette.text.primary } }} secondaryTypographyProps={{ sx: { color: muiTheme.palette.text.secondary } }} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedPayout.payoutDetails && Object.keys(selectedPayout.payoutDetails).length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: muiTheme.palette.primary.main, fontWeight: 800 }}>
                          Bank Account Details
                        </Typography>
                        <Grid container spacing={2}>
                          {Object.entries(selectedPayout.payoutDetails).map(([key, value]) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (text) => text.toUpperCase())}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: muiTheme.palette.text.primary, wordBreak: 'break-word' }}>
                                    {String(value) || '-'}
                                  </Typography>
                                </Box>
                                {value ? (
                                  <IconButton size="small" onClick={() => copyValue(value, key)} sx={{ '&:hover': { backgroundColor: hover } }}>
                                    <ContentCopy fontSize="small" />
                                  </IconButton>
                                ) : null}
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {(selectedPayout.reviewNote || selectedPayout.rejectionReason) && (
                  <Grid size={{ xs: 12 }}>
                    <Card variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: muiTheme.palette.primary.main, fontWeight: 800 }}>
                          Review Information
                        </Typography>
                        {selectedPayout.reviewNote && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Review Note</Typography>
                            <Typography variant="body2" sx={{ color: muiTheme.palette.text.primary }}>{selectedPayout.reviewNote}</Typography>
                          </Box>
                        )}
                        {selectedPayout.rejectionReason && (
                          <Box>
                            <Typography variant="caption" sx={{ color: muiTheme.palette.error.main }}>Rejection Reason</Typography>
                            <Typography variant="body2" sx={{ color: muiTheme.palette.error.main }}>{selectedPayout.rejectionReason}</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedPayout.status === 'paid' && (
                  <Grid size={{ xs: 12 }}>
                    <Card variant="outlined" sx={{ backgroundColor: alpha(muiTheme.palette.success.main, isLight ? 0.08 : 0.14), borderColor: alpha(muiTheme.palette.success.main, 0.24) }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: muiTheme.palette.success.main, fontWeight: 800 }}>
                          Payment Confirmation
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>External Reference</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                              {selectedPayout.externalReference || '-'}
                            </Typography>
                          </Grid>
                          {selectedPayout.paidAt && (
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Paid Date</Typography>
                              <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                                {format(new Date(selectedPayout.paidAt), 'PPP')}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => { setViewDialog(false); setSelectedPayout(null); }}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PayoutList;
