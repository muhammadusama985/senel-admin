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
import api from '../../api/client';

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
  { slug: 'about', label: 'About Page', defaultTitle: 'About Us' },
  { slug: 'contact', label: 'Contact Page', defaultTitle: 'Contact' },
  { slug: 'faq', label: 'FAQ Page', defaultTitle: 'FAQ' },
  { slug: 'help', label: 'Help Center', defaultTitle: 'Help Center' },
  { slug: 'shipping', label: 'Shipping Page', defaultTitle: 'Shipping Information' },
  { slug: 'returns', label: 'Returns Page', defaultTitle: 'Returns' },
  { slug: 'terms', label: 'Terms Page', defaultTitle: 'Terms & Conditions' },
  { slug: 'privacy', label: 'Privacy Page', defaultTitle: 'Privacy Policy' },
  { slug: 'custom', label: 'Custom Page', defaultTitle: '' },
] as const;

const StaticPages: React.FC = () => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
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
    queryKey: ['admin', 'pages', page, rowsPerPage, search, statusFilter],
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
          title: item.titleML?.en || item.title || '',
          content: item.contentML?.en || item.content || '',
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
      alert(mutationError.response?.data?.message || 'Failed to delete page');
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
      title: currentPage.titleML?.en || '',
      content: currentPage.contentML?.en || '',
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
      alert('Slug is required');
      return;
    }
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      alert('Content is required');
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
    isPublished ? <Chip label="Published" size="small" color="success" /> : <Chip label="Draft" size="small" variant="outlined" />;

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
        Error loading static pages. Please try again.
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          Static Pages
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search pages..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ width: isMobile ? '100%' : 220, ...fieldSx }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              sx={selectSx}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
            New Page
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
                <TableCell>Title</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Published Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pages?.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: muiTheme.palette.text.secondary }}>
                    No static pages found
                  </TableCell>
                </TableRow>
              )}
              {pages?.items?.map((currentPage: StaticPage) => (
                <TableRow key={currentPage._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                  <TableCell sx={{ color: muiTheme.palette.text.primary }}>
                    <Typography noWrap sx={{ maxWidth: 250 }}>
                      {currentPage.titleML?.en || 'No title'}
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
                        if (window.confirm('Are you sure you want to delete this page?')) {
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
        <DialogTitle>{editingPage ? 'Edit Static Page' : 'Create Static Page'}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: border }}>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Page Type</InputLabel>
                <Select
                  value={formData.pageSlot}
                  label="Page Type"
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
                          : (prev.title.trim() ? prev.title : selectedOption?.defaultTitle || prev.title),
                    }));
                  }}
                >
                  {STATIC_PAGE_OPTIONS.map((option) => (
                    <MenuItem key={option.slug} value={option.slug}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Title"
                fullWidth
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                required
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Slug"
                fullWidth
                value={formData.slug}
                onChange={(event) => setFormData({ ...formData, slug: event.target.value })}
                disabled={formData.pageSlot !== 'custom'}
                required
                helperText={
                  formData.pageSlot !== 'custom'
                    ? 'Slug is fixed for selected page type'
                    : 'URL-friendly name (for example: about-us)'
                }
                sx={fieldSx}
                FormHelperTextProps={{ sx: { color: muiTheme.palette.text.secondary } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Content"
                fullWidth
                multiline
                rows={10}
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                required
                placeholder="HTML content supported"
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={formData.isPublished} onChange={(event) => setFormData({ ...formData, isPublished: event.target.checked })} />}
                label="Publish immediately"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaticPages;
