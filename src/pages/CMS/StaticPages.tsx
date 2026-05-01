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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
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
import { Add, Delete, Edit, Publish, VisibilityOff } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { pickLocalizedText } from '../../utils/localization';

interface StaticPage {
  _id: string;
  slug: string;
  titleML?: {
    en: string;
    de: string;
    tr: string;
  };
  contentML?: {
    en: string;
    de: string;
    tr: string;
  };
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const STATIC_PAGE_OPTIONS = [
  { slug: 'about', labelKey: 'staticPages.pageTypeAbout', defaultTitleKey: 'staticPages.defaultAbout' },
  { slug: 'contact', labelKey: 'staticPages.pageTypeContact', defaultTitleKey: 'staticPages.defaultContact' },
  { slug: 'faq', labelKey: 'staticPages.pageTypeFaq', defaultTitleKey: 'staticPages.defaultFaq' },
  { slug: 'help', labelKey: 'staticPages.pageTypeHelp', defaultTitleKey: 'staticPages.defaultHelp' },
  { slug: 'shipping', labelKey: 'staticPages.pageTypeShipping', defaultTitleKey: 'staticPages.defaultShipping' },
  { slug: 'returns', labelKey: 'staticPages.pageTypeReturns', defaultTitleKey: 'staticPages.defaultReturns' },
  { slug: 'terms', labelKey: 'staticPages.pageTypeTerms', defaultTitleKey: 'staticPages.defaultTerms' },
  { slug: 'privacy', labelKey: 'staticPages.pageTypePrivacy', defaultTitleKey: 'staticPages.defaultPrivacy' },
  { slug: 'custom', labelKey: 'staticPages.pageTypeCustom', defaultTitleKey: '' },
] as const;

const StaticPages: React.FC = () => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [formData, setFormData] = useState({
    pageSlot: 'custom',
    slug: '',
    title: '',
    content: '',
    isPublished: false,
  });

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const tableHeader = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.14);
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

  const selectSx = {
    color: muiTheme.palette.text.primary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: muiTheme.palette.primary.main,
    },
  };

  const { data: pages, isLoading, error } = useQuery({
    queryKey: ['admin', 'pages', currentLanguage, page, rowsPerPage, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') {
        params.append('published', statusFilter === 'published' ? 'true' : 'false');
      }

      const response = await api.get(`/admin/pages?${params.toString()}`);
      return {
        ...response.data,
        items: response.data.items?.map((item: any) => ({
          ...item,
          title: pickLocalizedText(item.titleML, currentLanguage) || item.title || '',
          content: pickLocalizedText(item.contentML, currentLanguage) || item.content || '',
        })),
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/admin/pages', {
        slug: data.slug,
        titleML: { en: data.title, de: '', tr: '' },
        contentML: { en: data.content, de: '', tr: '' },
        isPublished: data.isPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await api.patch(`/admin/pages/${id}`, {
        slug: data.slug,
        titleML: { en: data.title, de: '', tr: '' },
        contentML: { en: data.content, de: '', tr: '' },
        isPublished: data.isPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      handleCloseDialog();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/pages/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/pages/${id}/unpublish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
    },
    onError: (mutationError: any) => {
      alert(mutationError.response?.data?.message || t('staticPages.failedDelete'));
    },
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenCreate = () => {
    setEditingPage(null);
    setFormData({
      pageSlot: 'custom',
      slug: '',
      title: '',
      content: '',
      isPublished: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (currentPage: StaticPage) => {
    setEditingPage(currentPage);
    const matchedPreset = STATIC_PAGE_OPTIONS.find((option) => option.slug === currentPage.slug);
    setFormData({
      pageSlot: matchedPreset ? matchedPreset.slug : 'custom',
      slug: currentPage.slug,
      title: pickLocalizedText(currentPage.titleML, currentLanguage),
      content: pickLocalizedText(currentPage.contentML, currentLanguage),
      isPublished: currentPage.isPublished,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPage(null);
  };

  const handleSubmit = () => {
    if (!formData.slug.trim()) {
      alert(t('staticPages.slugRequired'));
      return;
    }
    if (!formData.title.trim()) {
      alert(t('staticPages.titleRequired'));
      return;
    }
    if (!formData.content.trim()) {
      alert(t('staticPages.contentRequired'));
      return;
    }

    const payload = {
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      title: formData.title,
      content: formData.content,
      isPublished: formData.isPublished,
    };

    if (editingPage) {
      updateMutation.mutate({ id: editingPage._id, data: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const getStatusChip = (isPublished: boolean) =>
    isPublished ? <Chip label={t('announcements.published')} size="small" color="success" /> : <Chip label={t('announcements.drafts')} size="small" variant="outlined" />;

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
        {t('staticPages.failedLoad')}
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          {t('staticPages.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('staticPages.search')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ width: isMobile ? '100%' : 220, ...fieldSx }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('common.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('common.status')}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              sx={selectSx}
            >
              <MenuItem value="all">{t('announcements.all')}</MenuItem>
              <MenuItem value="published">{t('announcements.published')}</MenuItem>
              <MenuItem value="draft">{t('announcements.drafts')}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
            {t('staticPages.newPage')}
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
                <TableCell>{t('staticPages.titleColumn')}</TableCell>
                <TableCell>{t('blog.slug')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('staticPages.publishedDate')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pages?.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: muiTheme.palette.text.secondary }}>
                    {t('staticPages.noPages')}
                  </TableCell>
                </TableRow>
              )}
              {pages?.items?.map((currentPage: StaticPage) => (
                <TableRow key={currentPage._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                  <TableCell sx={{ color: muiTheme.palette.text.primary }}>
                    <Typography noWrap sx={{ maxWidth: 250 }}>
                      {pickLocalizedText(currentPage.titleML, currentLanguage) || t('staticPages.noTitle')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={currentPage.slug} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{getStatusChip(currentPage.isPublished)}</TableCell>
                  <TableCell sx={{ color: muiTheme.palette.text.secondary }}>
                    {currentPage.publishedAt ? format(new Date(currentPage.publishedAt), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenEdit(currentPage)} sx={{ '&:hover': { backgroundColor: hover } }}>
                      <Edit />
                    </IconButton>
                    {!currentPage.isPublished ? (
                      <IconButton
                        size="small"
                        onClick={() => publishMutation.mutate(currentPage._id)}
                        sx={{ color: accent, '&:hover': { backgroundColor: hover } }}
                      >
                        <Publish />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => unpublishMutation.mutate(currentPage._id)}
                        sx={{ '&:hover': { backgroundColor: hover } }}
                      >
                        <VisibilityOff />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (window.confirm(t('staticPages.deleteConfirm'))) {
                          deleteMutation.mutate(currentPage._id);
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
          count={pages?.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
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
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>{editingPage ? t('staticPages.editPage') : t('staticPages.createPage')}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: border }}>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>{t('staticPages.pageType')}</InputLabel>
                <Select
                  value={formData.pageSlot}
                  label={t('staticPages.pageType')}
                  onChange={(event) => {
                    const selectedSlot = event.target.value;
                    const selectedOption = STATIC_PAGE_OPTIONS.find((option) => option.slug === selectedSlot);
                    setFormData((prev) => ({
                      ...prev,
                      pageSlot: selectedSlot,
                      slug: selectedSlot === 'custom' ? prev.slug : selectedSlot,
                      title:
                        selectedSlot === 'custom'
                          ? prev.title
                          : (prev.title.trim() ? prev.title : (selectedOption?.defaultTitleKey ? t(selectedOption.defaultTitleKey) : prev.title)),
                    }));
                  }}
                >
                  {STATIC_PAGE_OPTIONS.map((option) => (
                    <MenuItem key={option.slug} value={option.slug}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('staticPages.titleColumn')}
                fullWidth
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                required
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('blog.slug')}
                fullWidth
                value={formData.slug}
                onChange={(event) => setFormData({ ...formData, slug: event.target.value })}
                disabled={formData.pageSlot !== 'custom'}
                required
                helperText={
                  formData.pageSlot !== 'custom'
                    ? t('staticPages.slugFixed')
                    : t('staticPages.slugHelp')
                }
                sx={fieldSx}
                FormHelperTextProps={{ sx: { color: muiTheme.palette.text.secondary } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('staticPages.content')}
                fullWidth
                multiline
                rows={10}
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                required
                placeholder={t('staticPages.htmlSupported')}
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={formData.isPublished} onChange={(event) => setFormData({ ...formData, isPublished: event.target.checked })} />}
                label={t('staticPages.publishImmediately')}
              />
            </Grid>
          </Grid>
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

export default StaticPages;
