import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import {
  Archive,
  ArrowBack,
  Cancel,
  CheckCircle,
  Edit,
  Inventory,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import { formatMoney } from '../../utils/currency';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

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
  };

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'products', id],
    queryFn: async () => {
      const response = await api.get('/products/admin/products');
      const products = response.data.products || [];
      const found = products.find((productItem: any) => productItem._id === id);
      if (!found) throw new Error('Product not found');
      return found;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/products/admin/products/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', id] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      await api.post(`/products/admin/products/${id}/reject`, { note: reason });
    },
    onSuccess: () => {
      setRejectDialog(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', id] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/products/admin/products/${id}`, { status: 'archived' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', id] });
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

  if (error || !product) {
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
        Product not found or error loading data.
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'warning' | 'success' | 'error' | 'info' | 'default'> = {
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      draft: 'default',
      archived: 'default',
    };
    return colors[status] || 'default';
  };

  const galleryImages = Array.from(
    new Set(
      [
        ...(product.imageUrls || []),
        ...((product.variants || []).flatMap((variant: any) => variant.imageUrls || [])),
      ].filter(Boolean),
    ),
  );
  const mainImage = galleryImages[selectedImage];

  return (
    <Box className="page-shell" sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <IconButton onClick={() => navigate('/products')} sx={{ mr: 1, color: muiTheme.palette.text.primary, '&:hover': { backgroundColor: hover } }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: muiTheme.palette.text.primary, flex: 1 }}>
          {product.title}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {product.status === 'submitted' && (
            <>
              <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Approve'}
              </Button>
              <Button variant="contained" color="error" startIcon={<Cancel />} onClick={() => setRejectDialog(true)}>
                Reject
              </Button>
            </>
          )}
          <Button variant="outlined" startIcon={<Edit />} onClick={() => navigate(`/products/edit/${id}`)}>
            Edit
          </Button>
          <Button variant="outlined" startIcon={<Archive />} onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
            {archiveMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Archive'}
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 3, backgroundColor: surface, border: `1px solid ${border}` }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              Status
            </Typography>
            <Chip label={product.status} color={getStatusColor(product.status)} sx={{ mt: 0.5, textTransform: 'capitalize' }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              Vendor
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: muiTheme.palette.text.primary }}>
              {product.vendorName || 'Unknown'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              Created
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: muiTheme.palette.text.primary }}>
              {product.createdAt ? format(new Date(product.createdAt), 'PPP') : 'N/A'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary }}>
              Featured
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: muiTheme.palette.text.primary }}>
              {product.isFeatured ? 'Yes' : 'No'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            {mainImage ? (
              <CardMedia component="img" height="300" image={mainImage} alt={product.title} sx={{ objectFit: 'contain', backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08), p: 2 }} />
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08) }}>
                <Inventory sx={{ fontSize: 100, color: muiTheme.palette.text.secondary }} />
              </Box>
            )}
            {galleryImages.length > 1 ? (
              <Stack direction="row" spacing={1} sx={{ p: 2, pt: 0, overflowX: 'auto' }}>
                {galleryImages.map((imageUrl, index) => (
                  <Box
                    key={`${imageUrl}-${index}`}
                    component="img"
                    src={imageUrl}
                    alt={`${product.title} ${index + 1}`}
                    onClick={() => setSelectedImage(index)}
                    sx={{
                      width: 72,
                      height: 72,
                      objectFit: 'cover',
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: `2px solid ${selectedImage === index ? accent : border}`,
                      backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08),
                      flexShrink: 0,
                    }}
                  />
                ))}
              </Stack>
            ) : null}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: muiTheme.palette.text.primary }}>
                {product.title}
              </Typography>
              <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary }} paragraph>
                {product.description}
              </Typography>

              <Divider sx={{ my: 2, borderColor: border }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                    SKU
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                    {product.sku || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                    MOQ
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                    {product.moq} units
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                    Stock
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                    {product.stockQty || 0}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                    Country
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: muiTheme.palette.text.primary }}>
                    {product.country || 'N/A'}
                  </Typography>
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
                    {product.priceTiers?.map((tier: any, index: number) => (
                      <TableRow key={index} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>{tier.minQty}+</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>
                            {formatMoney(Number(tier.unitPrice || 0), product.currency)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {product.hasVariants && product.variants?.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
                  Variants
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
                        <TableCell>SKU</TableCell>
                        <TableCell>Attributes</TableCell>
                        <TableCell>Stock</TableCell>
                        <TableCell>Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {product.variants.map((variant: any, index: number) => (
                        <TableRow key={index} sx={{ '&:hover': { backgroundColor: hover } }}>
                          <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>{variant.sku}</TableCell>
                          <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                            {Object.entries(variant.attributes || {}).map(([key, value]) => (
                              <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </TableCell>
                          <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>{variant.stockQty}</TableCell>
                          <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                            <Typography sx={{ color: accent }}>
                              {formatMoney(Number(variant.price || product.priceTiers?.[0]?.unitPrice || 0), product.currency)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}>
        <DialogTitle sx={{ color: muiTheme.palette.text.primary }}>Reject Product</DialogTitle>
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
          <Button onClick={() => rejectReason.trim() && rejectMutation.mutate({ reason: rejectReason })} variant="contained" color="error" disabled={!rejectReason.trim() || rejectMutation.isPending}>
            {rejectMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductDetail;
