import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Add, CloudUpload, Delete, Edit, Search } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { resolveMediaUrl } from '../../utils/media';

interface ShippingCompany {
  _id: string;
  name: string;
  code: string;
  description: string;
  logoUrl: string;
  trackingUrlTemplate: string;
  isActive: boolean;
  sortOrder: number;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

const ShippingCompanies: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    logoUrl: '',
    trackingUrlTemplate: '',
    isActive: true,
    sortOrder: 0,
    contactInfo: {
      email: '',
      phone: '',
      website: '',
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedLogoPreview, setSelectedLogoPreview] = useState<string | null>(null);

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: textPrimary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputLabel-root': { color: textSecondary },
  };

  const { data: companies, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ['admin', 'shipping-companies'],
    queryFn: async () => {
      const response = await api.get('/admin/shipping-companies');
      return response.data.shippingCompanies || [];
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await api.post('/admin/shipping-companies/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      setSelectedLogoPreview(null);
      setUploadingLogo(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to upload logo');
      setSelectedLogoPreview(null);
      setUploadingLogo(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/admin/shipping-companies', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-companies'] });
      handleCloseDialog();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create shipping company');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/admin/shipping-companies/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-companies'] });
      handleCloseDialog();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update shipping company');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/shipping-companies/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-companies'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to delete shipping company');
    },
  });

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      logoUrl: '',
      trackingUrlTemplate: '',
      isActive: true,
      sortOrder: 0,
      contactInfo: {
        email: '',
        phone: '',
        website: '',
      },
    });
    setSelectedLogoPreview(null);
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (company: ShippingCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      code: company.code || '',
      description: company.description || '',
      logoUrl: company.logoUrl || '',
      trackingUrlTemplate: company.trackingUrlTemplate || '',
      isActive: company.isActive ?? true,
      sortOrder: company.sortOrder ?? 0,
      contactInfo: {
        email: company.contactInfo?.email || '',
        phone: company.contactInfo?.phone || '',
        website: company.contactInfo?.website || '',
      },
    });
    setSelectedLogoPreview(null);
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(null);
    setError(null);
  };

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setUploadingLogo(true);
      uploadLogoMutation.mutate(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    setSelectedLogoPreview(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.code.trim()) {
      setError('Company code is required');
      return;
    }

    const data = {
      name: formData.name.trim(),
      code: formData.code.trim().toLowerCase(),
      description: formData.description.trim(),
      logoUrl: formData.logoUrl,
      trackingUrlTemplate: formData.trackingUrlTemplate.trim(),
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder),
      contactInfo: formData.contactInfo,
    };

    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany._id, data });
      return;
    }

    createMutation.mutate(data);
  };

  const filteredCompanies = React.useMemo(() => {
    if (!companies) return [];
    if (!search) return companies;
    const needle = search.toLowerCase();
    return companies.filter((company: ShippingCompany) =>
      company.name.toLowerCase().includes(needle) ||
      company.code.toLowerCase().includes(needle)
    );
  }, [companies, search]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2, backgroundColor: surface, color: textPrimary, border: `1px solid ${border}` }}
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Failed to load shipping companies
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: textPrimary }}>
          Shipping Companies
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
          Add Company
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {filteredCompanies.length === 0 ? (
        <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
          No shipping companies found
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          {filteredCompanies.map((company: ShippingCompany) => (
            <Card
              key={company._id}
              sx={{
                backgroundColor: surface,
                border: `1px solid ${border}`,
                borderRadius: 2,
                overflow: 'hidden',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: accent,
                  boxShadow: `0 4px 12px ${alpha(muiTheme.palette.primary.main, 0.15)}`,
                },
              }}
            >
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                {company.logoUrl ? (
                  <Box
                    component="img"
                    src={resolveMediaUrl(company.logoUrl) || ''}
                    alt={company.name}
                    sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: muiTheme.palette.action.hover,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      color: textSecondary,
                    }}
                  >
                    No Logo
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} color={textPrimary}>
                    {company.name}
                  </Typography>
                  <Typography variant="body2" color={textSecondary}>
                    {company.code}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={company.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={company.isActive ? 'success' : 'default'}
                    variant={company.isActive ? 'filled' : 'outlined'}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleOpenEdit(company)}
                    sx={{ '&:hover': { backgroundColor: hover } }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${company.name}"?`)) {
                        deleteMutation.mutate(company._id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    sx={{ '&:hover': { backgroundColor: hover } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {company.description && (
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography variant="body2" color={textSecondary}>
                    {company.description}
                  </Typography>
                </Box>
              )}
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>
          {editingCompany ? 'Edit Shipping Company' : 'Add Shipping Company'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Company Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                error={!formData.name.trim()}
                helperText={!formData.name.trim() ? 'Required' : ''}
                sx={fieldSx}
              />
              <TextField
                label="Code"
                fullWidth
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                required
                error={!formData.code.trim()}
                helperText={!formData.code.trim() ? 'Required' : 'e.g., dhl, ups'}
                sx={fieldSx}
              />
            </Box>

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={fieldSx}
            />

            <TextField
              label="Tracking URL Template"
              fullWidth
              value={formData.trackingUrlTemplate}
              onChange={(e) => setFormData({ ...formData, trackingUrlTemplate: e.target.value })}
              placeholder="https://track.example.com/{trackingNumber}"
              helperText="Use {trackingNumber} as placeholder"
              sx={fieldSx}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Contact Email"
                fullWidth
                value={formData.contactInfo?.email || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, email: e.target.value }
                })}
                sx={fieldSx}
              />
              <TextField
                label="Contact Phone"
                fullWidth
                value={formData.contactInfo?.phone || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: e.target.value }
                })}
                sx={fieldSx}
              />
            </Box>

            <TextField
              label="Website"
              fullWidth
              value={formData.contactInfo?.website || ''}
              onChange={(e) => setFormData({
                ...formData,
                contactInfo: { ...formData.contactInfo, website: e.target.value }
              })}
              sx={fieldSx}
            />

            <TextField
              label="Sort Order"
              type="number"
              fullWidth
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
              inputProps={{ min: 0 }}
              sx={fieldSx}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />

            {/* Logo Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: textSecondary }}>
                Company Logo
              </Typography>
              
              {(formData.logoUrl || selectedLogoPreview) && !uploadingLogo && (
                <Card sx={{ maxWidth: 120, position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="80"
                    image={resolveMediaUrl(formData.logoUrl) || selectedLogoPreview || ''}
                    alt="Logo"
                    sx={{ objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={handleRemoveLogo}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Card>
              )}
              
              {(uploadingLogo || (!formData.logoUrl && !selectedLogoPreview)) && (
                <Box
                  component="label"
                  sx={{
                    border: `2px dashed ${border}`,
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: accent, backgroundColor: hover },
                  }}
                >
                  {uploadingLogo ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      {selectedLogoPreview && (
                        <Box
                          component="img"
                          src={selectedLogoPreview}
                          alt="Preview"
                          sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, opacity: 0.7 }}
                        />
                      )}
                      <CircularProgress size={24} sx={{ color: muiTheme.palette.primary.main }} />
                      <Typography variant="caption" color="text.secondary">
                        Uploading...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <CloudUpload sx={{ fontSize: 40, color: textSecondary, mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Click to upload logo
                      </Typography>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoSelect}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim() || !formData.code.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Save'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShippingCompanies;