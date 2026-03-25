import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
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
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import {
  CheckCircle,
  Close,
  Inventory,
  MoreVert,
  Cancel,
  Search,
  Visibility,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import { formatMoney } from '../../utils/currency';

const ProductApprovals: React.FC = () => {
  const muiTheme = useMuiTheme();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveDialog, setApproveDialog] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'products', 'pending', page, rowsPerPage, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        status: 'submitted',
        ...(search && { q: search }),
      });
      const response = await api.get(`/products/admin/products?${params}`);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      await api.post(`/products/admin/products/${id}/approve`, { note: note ?? '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setApproveDialog(false);
      setApproveNote('');
      setDetailOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/products/admin/products/${id}/reject`, { note: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setRejectDialog(false);
      setRejectReason('');
      setDetailOpen(false);
    },
  });

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

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Error loading products. Please refresh.
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: muiTheme.palette.text.primary }}>
          Product Approvals
        </Typography>

        <TextField
          size="small"
          placeholder="Search products..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: isMobile ? '100%' : 300, ...fieldSx }}
        />
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
              <TableCell>Product</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>MOQ</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.products?.map((product: any) => (
              <TableRow key={product._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={product.imageUrls?.[0]} variant="rounded" sx={{ width: 40, height: 40, border: `1px solid ${border}`, bgcolor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08) }}>
                      <Inventory />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                        {product.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                        SKU: {product.sku || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  {product.vendorName || 'Unknown'}
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  {product.categoryName || 'N/A'}
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>{product.moq}</TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                  <Typography fontWeight={800} sx={{ color: accent }}>
                    {formatMoney(Number(product.priceTiers?.[0]?.unitPrice || 0), product.currency)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  {format(new Date(product.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                  <IconButton size="small" onClick={(event) => { setAnchorEl(event.currentTarget); setSelectedProduct(product); }} sx={{ '&:hover': { backgroundColor: hover } }}>
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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <MenuItem
          onClick={() => {
            setDetailOpen(true);
            setAnchorEl(null);
          }}
        >
          <Visibility sx={{ mr: 1, fontSize: 20 }} /> View Details
        </MenuItem>
      </Menu>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        {selectedProduct && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Product Details</Typography>
                <IconButton onClick={() => setDetailOpen(false)} sx={{ '&:hover': { backgroundColor: hover } }}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: border }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
                    {selectedProduct.imageUrls?.length > 0 ? (
                      <CardMedia component="img" height="200" image={selectedProduct.imageUrls[0]} alt={selectedProduct.title} sx={{ objectFit: 'contain', backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08), p: 2 }} />
                    ) : (
                      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08) }}>
                        <Inventory sx={{ fontSize: 60, color: muiTheme.palette.text.secondary }} />
                      </Box>
                    )}
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
                    <CardContent>
                      <Typography variant="h5" gutterBottom sx={{ color: muiTheme.palette.text.primary }}>
                        {selectedProduct.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary }} paragraph>
                        {selectedProduct.description}
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Vendor</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>{selectedProduct.vendorName || 'Unknown'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Category</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>{selectedProduct.categoryName || 'N/A'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>MOQ</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>{selectedProduct.moq} units</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>Stock</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>{selectedProduct.stockQty || 0}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
                        Price Tiers
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ backgroundColor: surface, borderColor: border }}>
                        <Table size="small">
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
                              <TableCell>Min Quantity</TableCell>
                              <TableCell>Unit Price</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedProduct.priceTiers?.map((tier: any, index: number) => (
                              <TableRow key={index} sx={{ '&:hover': { backgroundColor: hover } }}>
                                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>{tier.minQty}+</TableCell>
                                <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                                  <Typography fontWeight={800} sx={{ color: accent }}>{formatMoney(Number(tier.unitPrice || 0), selectedProduct.currency)}</Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setRejectDialog(true)} color="error" startIcon={<Cancel />} disabled={rejectMutation.isPending}>
                Reject
              </Button>
              <Button
                onClick={() => setApproveDialog(true)}
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Approve'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>Approve Product</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Approval Note (Optional)"
            fullWidth
            multiline
            rows={3}
            value={approveNote}
            onChange={(event) => setApproveNote(event.target.value)}
            placeholder="Add an optional note for approval..."
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button
            onClick={() => selectedProduct && approveMutation.mutate({ id: selectedProduct._id, note: approveNote.trim() })}
            variant="contained"
            color="success"
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle>Reject Product</DialogTitle>
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
            placeholder="Explain why the product is being rejected..."
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button
            onClick={() => selectedProduct && rejectReason.trim() && rejectMutation.mutate({ id: selectedProduct._id, reason: rejectReason })}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductApprovals;
