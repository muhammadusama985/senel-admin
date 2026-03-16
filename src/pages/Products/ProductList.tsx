import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
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
  Add,
  Archive,
  Clear,
  Edit,
  FilterList,
  Inventory,
  MoreVert,
  Search,
  Star,
  StarBorder,
  Visibility,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const accent = muiTheme.palette.secondary.main;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const tableHeader = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);

  const shellSx = {
    p: 2,
    borderRadius: 3,
    backgroundColor: surface,
    border: `1px solid ${border}`,
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputAdornment-root': { color: muiTheme.palette.text.secondary },
    '& input::placeholder': { color: muiTheme.palette.text.secondary, opacity: 1 },
  };

  const selectSx = {
    color: muiTheme.palette.text.primary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '& .MuiSvgIcon-root': { color: muiTheme.palette.text.primary },
  };

  const { data: products, isLoading: productsLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'products', 'all', page, rowsPerPage, search, statusFilter, vendorFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        ...(search && { q: search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(vendorFilter !== 'all' && { vendorId: vendorFilter }),
      });
      const response = await api.get(`/products/admin/products?${params}`);
      return response.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['admin', 'vendors', 'list'],
    queryFn: async () => {
      const response = await api.get('/vendors/admin/vendors?limit=100');
      return response.data.vendors || [];
    },
  });

  const featuredMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      await api.post(`/products/admin/products/${id}/feature`, { isFeatured: featured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/products/admin/products/${id}`, { status: 'archived' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      handleMenuClose();
    },
  });

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, product: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };

  const handleArchive = () => {
    if (selectedProduct && window.confirm('Are you sure you want to archive this product?')) {
      archiveMutation.mutate(selectedProduct._id);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setVendorFilter('all');
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, 'warning' | 'success' | 'error' | 'info' | 'default'> = {
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      draft: 'default',
      blocked: 'error',
      archived: 'default',
    };

    return <Chip label={status} size="small" color={colors[status] || 'default'} sx={{ textTransform: 'capitalize' }} />;
  };

  if (productsLoading) {
    return <LinearProgress sx={{ backgroundColor: border, '& .MuiLinearProgress-bar': { backgroundColor: accent } }} />;
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2, backgroundColor: surface, color: muiTheme.palette.text.primary, border: `1px solid ${border}` }}
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Error loading products. Please check API connection.
      </Alert>
    );
  }

  return (
    <Box sx={shellSx}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          Products
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/products/create')}>
            Create Product
          </Button>

          <TextField
            size="small"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: isMobile ? '100%' : 250, ...fieldSx }}
          />

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ borderColor: border, color: muiTheme.palette.text.primary, '&:hover': { backgroundColor: hover } }}
          >
            Filters
          </Button>

          {(search || statusFilter !== 'all' || vendorFilter !== 'all') && (
            <Button variant="text" startIcon={<Clear />} onClick={clearFilters} sx={{ '&:hover': { backgroundColor: hover } }}>
              Clear
            </Button>
          )}
        </Box>
      </Box>

      <Collapse in={showFilters}>
        <Card sx={{ mb: 3, backgroundColor: surface, border: `1px solid ${border}` }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: muiTheme.palette.text.secondary }}>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)} sx={selectSx}>
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="submitted">Pending</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: muiTheme.palette.text.secondary }}>Vendor</InputLabel>
                  <Select value={vendorFilter} label="Vendor" onChange={(e) => setVendorFilter(e.target.value)} sx={selectSx}>
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
          </CardContent>
        </Card>
      </Collapse>

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
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Featured</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products?.products?.map((product: any) => (
              <TableRow key={product._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={product.imageUrls?.[0]}
                      variant="rounded"
                      sx={{
                        width: 40,
                        height: 40,
                        border: `1px solid ${border}`,
                        bgcolor: alpha(muiTheme.palette.primary.main, isLight ? 0.08 : 0.16),
                      }}
                    >
                      <Inventory />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
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
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  <Typography fontWeight={800} sx={{ color: accent }}>
                    EUR {product.priceTiers?.[0]?.unitPrice || 0}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  <Chip label={product.stockQty || 0} size="small" color={product.stockQty > 0 ? 'success' : 'error'} />
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  {getStatusChip(product.status)}
                </TableCell>
                <TableCell sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  <IconButton
                    size="small"
                    onClick={() => featuredMutation.mutate({ id: product._id, featured: !product.isFeatured })}
                    color={product.isFeatured ? 'warning' : 'default'}
                    disabled={featuredMutation.isPending}
                    sx={{ color: product.isFeatured ? accent : muiTheme.palette.text.primary, '&:hover': { backgroundColor: hover } }}
                  >
                    {product.isFeatured ? <Star /> : <StarBorder />}
                  </IconButton>
                </TableCell>
                <TableCell align="center" sx={{ color: muiTheme.palette.text.primary, borderBottom: `1px solid ${border}` }}>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, product)} sx={{ '&:hover': { backgroundColor: hover } }}>
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
        count={products?.total || 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          mt: 1,
          color: muiTheme.palette.text.primary,
          '& .MuiTablePagination-selectIcon': { color: muiTheme.palette.text.primary },
          '& .MuiTablePagination-actions button': { color: muiTheme.palette.text.primary },
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: surface,
            border: `1px solid ${border}`,
          },
        }}
      >
        <MenuItem onClick={() => { navigate(`/products/${selectedProduct?._id}`); handleMenuClose(); }}>
          <Visibility sx={{ mr: 1, fontSize: 20 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/products/edit/${selectedProduct?._id}`); handleMenuClose(); }}>
          <Edit sx={{ mr: 1, fontSize: 20 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedProduct) {
              featuredMutation.mutate({ id: selectedProduct._id, featured: !selectedProduct.isFeatured });
            }
            handleMenuClose();
          }}
        >
          {selectedProduct?.isFeatured ? <StarBorder sx={{ mr: 1, fontSize: 20 }} /> : <Star sx={{ mr: 1, fontSize: 20 }} />}
          {selectedProduct?.isFeatured ? 'Remove Featured' : 'Mark Featured'}
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          <Archive sx={{ mr: 1, fontSize: 20 }} /> Archive
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ProductList;
