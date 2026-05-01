import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Add, Delete, Edit, Visibility, VisibilityOff } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ImageUpload from '../../components/common/ImageUpload';
import { pickLocalizedText } from '../../utils/localization';
import { resolveMediaUrl } from '../../utils/media';

interface Banner {
  _id: string;
  priority: number;
  imageUrl: string;
  imageUrlMobile?: string;
  titleML: {
    en: string;
    de: string;
    tr: string;
  };
  subtitleML: {
    en: string;
    de: string;
    tr: string;
  };
  ctaTextML: {
    en: string;
    de: string;
    tr: string;
  };
  ctaUrl?: string;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const Banners: React.FC = () => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMobileFile, setImageMobileFile] = useState<File | null>(null);
  const [langTabValue, setLangTabValue] = useState(0);
  const [imagePreview, setImagePreview] = useState('');
  const [imageMobilePreview, setImageMobilePreview] = useState('');
  const [formData, setFormData] = useState({
    priority: 0,
    imageUrl: '',
    imageUrlMobile: '',
    titleML: { en: '', de: '', tr: '' },
    subtitleML: { en: '', de: '', tr: '' },
    ctaTextML: { en: '', de: '', tr: '' },
    ctaUrl: '',
    startAt: '',
    endAt: '',
    isActive: true,
  });

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

  const tabsSx = {
    borderBottom: `1px solid ${border}`,
    '& .MuiTab-root': {
      color: muiTheme.palette.text.secondary,
      fontWeight: 600,
    },
    '& .Mui-selected': {
      color: muiTheme.palette.primary.main,
    },
  };

  const getFullImageUrl = (imagePath: string | undefined): string => {
    return resolveMediaUrl(imagePath);
  };

  const formatDateForBackend = (dateString: string): string | null => {
    if (!dateString.trim()) return null;
    return new Date(`${dateString}T12:00:00.000Z`).toISOString();
  };

  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const { data: banners, isLoading, error } = useQuery({
    queryKey: ['admin', 'banners', currentLanguage, page, rowsPerPage, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/admin/banners?${params.toString()}`);
      return {
        items: response.data.items || response.data || [],
        total:
          response.data.total ||
          (response.data.items ? response.data.items.length : response.data.length) ||
          0,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = new FormData();
      payload.append(
        'data',
        JSON.stringify({
          priority: Number(data.priority) || 0,
          titleML: data.titleML,
          subtitleML: data.subtitleML,
          ctaTextML: data.ctaTextML,
          ctaUrl: data.ctaUrl || '',
          startAt: formatDateForBackend(data.startAt),
          endAt: formatDateForBackend(data.endAt),
          isActive: data.isActive,
        }),
      );

      if (imageFile) payload.append('image', imageFile);
      if (imageMobileFile) payload.append('imageMobile', imageMobileFile);

      const response = await api.post('/admin/banners', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      handleCloseDialog();
    },
    onError: (mutationError: any) => {
      alert(mutationError.response?.data?.message || t('banners.failedCreate'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const payload = new FormData();
      const jsonData: any = {
        priority: Number(data.priority) || 0,
        titleML: data.titleML,
        subtitleML: data.subtitleML,
        ctaTextML: data.ctaTextML,
        ctaUrl: data.ctaUrl || '',
        startAt: formatDateForBackend(data.startAt),
        endAt: formatDateForBackend(data.endAt),
        isActive: data.isActive,
      };

      if (!imageFile && data.imageUrl) jsonData.imageUrl = data.imageUrl;
      if (!imageMobileFile && data.imageUrlMobile) jsonData.imageUrlMobile = data.imageUrlMobile;

      payload.append('data', JSON.stringify(jsonData));
      if (imageFile) payload.append('image', imageFile);
      if (imageMobileFile) payload.append('imageMobile', imageMobileFile);

      const response = await api.patch(`/admin/banners/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      handleCloseDialog();
    },
    onError: (mutationError: any) => {
      alert(mutationError.response?.data?.message || t('banners.failedUpdate'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/banners/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/banners/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
  });

  const resetForm = () => {
    setFormData({
      priority: 0,
      imageUrl: '',
      imageUrlMobile: '',
      titleML: { en: '', de: '', tr: '' },
      subtitleML: { en: '', de: '', tr: '' },
      ctaTextML: { en: '', de: '', tr: '' },
      ctaUrl: '',
      startAt: '',
      endAt: '',
      isActive: true,
    });
    setImagePreview('');
    setImageMobilePreview('');
    setImageFile(null);
    setImageMobileFile(null);
    setLangTabValue(0);
  };

  const handleOpenCreate = () => {
    setEditingBanner(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setLangTabValue(0);
    setFormData({
      priority: banner.priority,
      imageUrl: banner.imageUrl,
      imageUrlMobile: banner.imageUrlMobile || '',
      titleML: banner.titleML || { en: '', de: '', tr: '' },
      subtitleML: banner.subtitleML || { en: '', de: '', tr: '' },
      ctaTextML: banner.ctaTextML || { en: '', de: '', tr: '' },
      ctaUrl: banner.ctaUrl || '',
      startAt: formatDateForDisplay(banner.startAt),
      endAt: formatDateForDisplay(banner.endAt),
      isActive: banner.isActive,
    });
    setImagePreview(getFullImageUrl(banner.imageUrl));
    setImageMobilePreview(banner.imageUrlMobile ? getFullImageUrl(banner.imageUrlMobile) : '');
    setImageFile(null);
    setImageMobileFile(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBanner(null);
    setImageFile(null);
    setImageMobileFile(null);
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    if (imageMobilePreview.startsWith('blob:')) URL.revokeObjectURL(imageMobilePreview);
    setImagePreview('');
    setImageMobilePreview('');
  };

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageMobileUpload = (file: File) => {
    setImageMobileFile(file);
    setImageMobilePreview(URL.createObjectURL(file));
  };

  const handleImageRemove = () => {
    setImageFile(null);
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
  };

  const handleImageMobileRemove = () => {
    setImageMobileFile(null);
    if (imageMobilePreview.startsWith('blob:')) URL.revokeObjectURL(imageMobilePreview);
    setImageMobilePreview('');
  };

  const handleLanguageChange = (lang: string, field: 'titleML' | 'subtitleML' | 'ctaTextML', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  };

  const handleSubmit = () => {
    if (!editingBanner && !imageFile) {
      alert(t('banners.selectImage'));
      return;
    }

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner._id, data: formData });
      return;
    }

    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
        {t('banners.failedLoad')}
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          {t('banners.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('banners.search')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ width: isMobile ? '100%' : 220, ...fieldSx }}
          />
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
            {t('banners.newBanner')}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
        <TableContainer>
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
                <TableCell>{t('banners.preview')}</TableCell>
                <TableCell>{t('banners.titleColumn')}</TableCell>
                <TableCell>{t('banners.priority')}</TableCell>
                <TableCell>{t('banners.schedule')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {banners?.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: muiTheme.palette.text.secondary }}>
                    {t('banners.noBanners')}
                  </TableCell>
                </TableRow>
              )}

              {banners?.items?.map((banner: Banner) => (
                <TableRow key={banner._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                  <TableCell>
                    <Tooltip title={banner.imageUrl || ''}>
                      <Box
                        sx={{
                          width: 60,
                          height: 40,
                          borderRadius: 1,
                          overflow: 'hidden',
                          backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${border}`,
                        }}
                      >
                        {banner.imageUrl ? (
                          <Box
                            component="img"
                            src={getFullImageUrl(banner.imageUrl)}
                            alt={pickLocalizedText(banner.titleML, currentLanguage) || t('banners.title')}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                              const target = event.currentTarget;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {t('banners.noImage')}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color: muiTheme.palette.text.primary }}>
                    <Typography noWrap sx={{ maxWidth: 160 }}>
                      {pickLocalizedText(banner.titleML, currentLanguage) || t('banners.noTitle')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: muiTheme.palette.text.primary }}>{banner.priority}</TableCell>
                  <TableCell>
                    {banner.startAt ? (
                      <Box>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {t('banners.from')}: {format(new Date(banner.startAt), 'MMM dd, yyyy')}
                        </Typography>
                        {banner.endAt && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {t('banners.to')}: {format(new Date(banner.endAt), 'MMM dd, yyyy')}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('banners.noSchedule')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={banner.isActive ? t('catalog.active') : t('catalog.inactive')} size="small" color={banner.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenEdit(banner)} sx={{ '&:hover': { backgroundColor: hover } }}>
                      <Edit />
                    </IconButton>
                    {!banner.isActive ? (
                      <IconButton
                        size="small"
                        onClick={() => activateMutation.mutate(banner._id)}
                        sx={{ color: accent, '&:hover': { backgroundColor: hover } }}
                      >
                        <Visibility />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={() => deactivateMutation.mutate(banner._id)} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <VisibilityOff />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (window.confirm(t('banners.deleteConfirm'))) {
                          deleteMutation.mutate(banner._id);
                        }
                      }}
                      sx={{ color: muiTheme.palette.error.main, '&:hover': { backgroundColor: hover } }}
                    >
                      <Delete />
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
          count={banners?.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          sx={{
            color: muiTheme.palette.text.secondary,
            '& .MuiTablePagination-selectIcon': { color: muiTheme.palette.text.secondary },
            '& .MuiTablePagination-actions button': { color: muiTheme.palette.text.primary },
          }}
        />
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        scroll="body"
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>{editingBanner ? t('banners.editBanner') : t('banners.createBanner')}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: border }}>
          <Tabs value={langTabValue} onChange={(_event, value) => setLangTabValue(value)} sx={tabsSx}>
            <Tab label={t('banners.english')} />
            <Tab label={t('banners.german')} />
            <Tab label={t('banners.turkish')} />
          </Tabs>

          {langTabValue === 0 && (
            <Grid container spacing={3} sx={{ pt: 3 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.titleEn')}
                  fullWidth
                  value={formData.titleML.en}
                  onChange={(event) => handleLanguageChange('en', 'titleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.subtitleEn')}
                  fullWidth
                  value={formData.subtitleML.en}
                  onChange={(event) => handleLanguageChange('en', 'subtitleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.ctaTextEn')}
                  fullWidth
                  value={formData.ctaTextML.en}
                  onChange={(event) => handleLanguageChange('en', 'ctaTextML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          )}

          {langTabValue === 1 && (
            <Grid container spacing={3} sx={{ pt: 3 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.titleDe')}
                  fullWidth
                  value={formData.titleML.de}
                  onChange={(event) => handleLanguageChange('de', 'titleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.subtitleDe')}
                  fullWidth
                  value={formData.subtitleML.de}
                  onChange={(event) => handleLanguageChange('de', 'subtitleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.ctaTextDe')}
                  fullWidth
                  value={formData.ctaTextML.de}
                  onChange={(event) => handleLanguageChange('de', 'ctaTextML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          )}

          {langTabValue === 2 && (
            <Grid container spacing={3} sx={{ pt: 3 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.titleTr')}
                  fullWidth
                  value={formData.titleML.tr}
                  onChange={(event) => handleLanguageChange('tr', 'titleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.subtitleTr')}
                  fullWidth
                  value={formData.subtitleML.tr}
                  onChange={(event) => handleLanguageChange('tr', 'subtitleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.ctaTextTr')}
                  fullWidth
                  value={formData.ctaTextML.tr}
                  onChange={(event) => handleLanguageChange('tr', 'ctaTextML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          )}

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
              {t('banners.settings')}
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label={t('banners.priority')}
                  type="number"
                  fullWidth
                  value={formData.priority}
                  onChange={(event) => setFormData({ ...formData, priority: parseInt(event.target.value, 10) || 0 })}
                  helperText={t('banners.priorityHelp')}
                  sx={fieldSx}
                  FormHelperTextProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom color="text.primary">
                  {t('banners.desktopImage')}
                </Typography>
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={imagePreview}
                  label={t('banners.uploadDesktopImage')}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom color="text.primary">
                  {t('banners.mobileImageOptional')}
                </Typography>
                <ImageUpload
                  onImageUpload={handleImageMobileUpload}
                  onImageRemove={handleImageMobileRemove}
                  currentImage={imageMobilePreview}
                  label={t('banners.uploadMobileImage')}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('banners.ctaUrl')}
                  fullWidth
                  value={formData.ctaUrl}
                  onChange={(event) => setFormData({ ...formData, ctaUrl: event.target.value })}
                  placeholder={t('banners.ctaUrlPlaceholder')}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label={t('banners.startDate')}
                  type="date"
                  fullWidth
                  value={formData.startAt}
                  onChange={(event) => setFormData({ ...formData, startAt: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label={t('banners.endDate')}
                  type="date"
                  fullWidth
                  value={formData.endAt}
                  onChange={(event) => setFormData({ ...formData, endAt: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} />}
                  label={t('catalog.active')}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Banners;
