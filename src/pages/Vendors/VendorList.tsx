import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
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
import { Block, CheckCircle, Cancel, Info, MoreVert, Search, Visibility } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

type StatusColor = 'default' | 'warning' | 'success' | 'error' | 'info';

const VendorList: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

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
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: muiTheme.palette.primary.main },
    '& .MuiSvgIcon-root': { color: muiTheme.palette.text.primary },
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'vendors', currentLanguage, statusFilter],
    queryFn: async () => {
      const url = statusFilter !== 'all' ? `/vendors/admin/vendors?status=${statusFilter}` : '/vendors/admin/vendors';
      const response = await api.get(url);
      const vendors = response.data.vendors || [];
      return { items: vendors, total: vendors.length };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (vendorId: string) => api.post(`/vendors/admin/vendors/${vendorId}/approve`, { note: 'Approved by admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      handleMenuClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (vendorId: string) => api.post(`/vendors/admin/vendors/${vendorId}/reject`, { note: 'Rejected by admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      handleMenuClose();
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (vendorId: string) => api.post(`/vendors/admin/vendors/${vendorId}/block`, { note: 'Blocked by admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      handleMenuClose();
    },
  });

  const underReviewMutation = useMutation({
    mutationFn: async (vendorId: string) => api.post(`/vendors/admin/vendors/${vendorId}/under-review`, { note: 'Set under review' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      handleMenuClose();
    },
  });

  const getStatusChip = (status: string): StatusColor => {
    const colors: Record<string, StatusColor> = {
      draft: 'default',
      submitted: 'warning',
      under_review: 'info',
      approved: 'success',
      rejected: 'error',
      blocked: 'error',
    };
    return colors[status] || 'default';
  };

  const filteredVendors = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((vendor: any) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        vendor.storeName?.toLowerCase().includes(searchLower) ||
        vendor.email?.toLowerCase().includes(searchLower) ||
        vendor.business?.companyName?.toLowerCase().includes(searchLower)
      );
    });
  }, [data, search]);

  const paginatedVendors = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredVendors.slice(start, start + rowsPerPage);
  }, [filteredVendors, page, rowsPerPage]);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVendor(null);
  };

  const handleAction = async (action: string) => {
    if (!selectedVendor) return;
    switch (action) {
      case 'approve':
        await approveMutation.mutateAsync(selectedVendor._id);
        break;
      case 'reject':
        await rejectMutation.mutateAsync(selectedVendor._id);
        break;
      case 'block':
        await blockMutation.mutateAsync(selectedVendor._id);
        break;
      case 'under-review':
        await underReviewMutation.mutateAsync(selectedVendor._id);
        break;
      case 'view':
        navigate(`/vendors/${selectedVendor._id}`);
        break;
    }
    refetch();
    handleMenuClose();
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
        {t('vendors.errorLoading')}
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: muiTheme.palette.text.primary }}>
          {t('vendors.title')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('vendors.searchPlaceholder')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: isMobile ? '100%' : 250, ...fieldSx }}
          />

          <FormControl size="small" sx={{ width: isMobile ? '100%' : 150 }}>
            <InputLabel>{t('vendors.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('vendors.status')}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              sx={selectSx}
            >
              <MenuItem value="all">{t('vendors.all')}</MenuItem>
              <MenuItem value="submitted">{t('vendors.submitted')}</MenuItem>
              <MenuItem value="under_review">{t('vendors.underReview')}</MenuItem>
              <MenuItem value="approved">{t('vendors.approved')}</MenuItem>
              <MenuItem value="rejected">{t('vendors.rejected')}</MenuItem>
              <MenuItem value="blocked">{t('vendors.blocked')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 2, overflow: 'hidden' }}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: tableHeader,
                '& th': {
                  color: muiTheme.palette.text.primary,
                  fontWeight: 700,
                  borderBottom: `1px solid ${border}`,
                },
              }}
            >
              <TableCell>{t('vendors.storeName')}</TableCell>
              <TableCell>{t('common.email')}</TableCell>
              {!isMobile && <TableCell>{t('vendors.company')}</TableCell>}
              <TableCell>{t('vendors.status')}</TableCell>
              <TableCell>{t('vendors.documents')}</TableCell>
              <TableCell>{t('vendors.joined')}</TableCell>
              <TableCell align="center">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedVendors.map((vendor: any) => (
              <TableRow
                key={vendor._id}
                hover
                sx={{
                  '& td': {
                    color: muiTheme.palette.text.primary,
                    borderBottom: `1px solid ${border}`,
                  },
                  '&:hover': { backgroundColor: hover },
                }}
              >
                <TableCell>
                  <Typography fontWeight={500}>{vendor.storeName}</Typography>
                  {isMobile && (
                    <Typography variant="caption" display="block" sx={{ color: muiTheme.palette.text.secondary }}>
                      {vendor.email}
                    </Typography>
                  )}
                </TableCell>
                {!isMobile && <TableCell>{vendor.email}</TableCell>}
                {!isMobile && <TableCell>{vendor.business?.companyName || '-'}</TableCell>}
                <TableCell>
                  <Chip label={vendor.status || 'draft'} size="small" color={getStatusChip(vendor.status || 'draft')} sx={{ textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell>
                  <Chip label={t('vendors.docsCount', { count: vendor.verificationDocs?.length || 0 })} size="small" variant="outlined" icon={<Info sx={{ color: accent }} />} />
                </TableCell>
                <TableCell>{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={(event) => { setAnchorEl(event.currentTarget); setSelectedVendor(vendor); }}>
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
        count={filteredVendors.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        sx={{
          color: muiTheme.palette.text.secondary,
          '& .MuiSvgIcon-root': { color: muiTheme.palette.text.secondary },
          '& .MuiInputBase-root': { color: muiTheme.palette.text.secondary },
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <MenuItem onClick={() => handleAction('view')}>
          <Visibility sx={{ mr: 1, fontSize: 20 }} /> {t('vendors.viewDetails')}
        </MenuItem>

        {selectedVendor?.status === 'submitted' && (
          <>
            <MenuItem onClick={() => handleAction('approve')}>
              <CheckCircle sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.success.main }} /> {t('vendors.approve')}
            </MenuItem>
            <MenuItem onClick={() => handleAction('reject')}>
              <Cancel sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.error.main }} /> {t('vendors.reject')}
            </MenuItem>
            <MenuItem onClick={() => handleAction('under-review')}>
              <Info sx={{ mr: 1, fontSize: 20, color: accent }} /> {t('vendors.setUnderReview')}
            </MenuItem>
          </>
        )}

        {selectedVendor?.status === 'approved' && (
          <MenuItem onClick={() => handleAction('block')}>
            <Block sx={{ mr: 1, fontSize: 20, color: accent }} /> {t('vendors.block')}
          </MenuItem>
        )}

        {selectedVendor?.status === 'under_review' && (
          <>
            <MenuItem onClick={() => handleAction('approve')}>
              <CheckCircle sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.success.main }} /> {t('vendors.approve')}
            </MenuItem>
            <MenuItem onClick={() => handleAction('reject')}>
              <Cancel sx={{ mr: 1, fontSize: 20, color: muiTheme.palette.error.main }} /> {t('vendors.reject')}
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default VendorList;
