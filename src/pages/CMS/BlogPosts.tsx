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
import { Add, Delete, Edit, Publish, VisibilityOff } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/client';
import ImageUpload from '../../components/common/ImageUpload';
import { resolveMediaUrl } from '../../utils/media';

interface BlogPost {
  _id: string;
  slug: string;
  coverImageUrl?: string;
  tags: string[];
  titleML: { en: string; de: string; tr: string };
  summaryML: { en: string; de: string; tr: string };
  contentML: { en: string; de: string; tr: string };
  authorName?: string;
  seo?: {
    metaTitleML?: { en: string; de: string; tr: string };
    metaDescriptionML?: { en: string; de: string; tr: string };
    keywords?: string[];
  };
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const BlogPosts: React.FC = () => {
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [langTabValue, setLangTabValue] = useState(0);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [formData, setFormData] = useState({
    slug: '',
    coverImageUrl: '',
    tags: [] as string[],
    titleML: { en: '', de: '', tr: '' },
    summaryML: { en: '', de: '', tr: '' },
    contentML: { en: '', de: '', tr: '' },
    authorName: '',
    seo: {
      metaTitleML: { en: '', de: '', tr: '' },
      metaDescriptionML: { en: '', de: '', tr: '' },
      keywords: [] as string[],
    },
    isPublished: false,
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

  const selectSx = {
    color: muiTheme.palette.text.primary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: muiTheme.palette.primary.main,
    },
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

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['admin', 'blog', page, rowsPerPage, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') {
        params.append('published', statusFilter === 'published' ? 'true' : 'false');
      }
      const response = await api.get(`/admin/blog?${params.toString()}`);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = new FormData();
      payload.append(
        'data',
        JSON.stringify({
          slug: data.slug,
          tags: data.tags,
          titleML: data.titleML,
          summaryML: data.summaryML,
          contentML: data.contentML,
          authorName: data.authorName || '',
          seo: data.seo,
          isPublished: data.isPublished,
        }),
      );
      if (coverImageFile) {
        payload.append('coverImage', coverImageFile);
      }
      const response = await api.post('/admin/blog', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
      handleCloseDialog();
    },
    onError: (mutationError: any) => {
      alert(mutationError.response?.data?.message || 'Failed to create blog post');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const payload = new FormData();
      const jsonData: any = {
        slug: data.slug,
        tags: data.tags,
        titleML: data.titleML,
        summaryML: data.summaryML,
        contentML: data.contentML,
        authorName: data.authorName || '',
        seo: data.seo,
        isPublished: data.isPublished,
      };
      if (!coverImageFile && data.coverImageUrl) {
        jsonData.coverImageUrl = data.coverImageUrl;
      }
      payload.append('data', JSON.stringify(jsonData));
      if (coverImageFile) {
        payload.append('coverImage', coverImageFile);
      }
      const response = await api.patch(`/admin/blog/${id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
      handleCloseDialog();
    },
    onError: (mutationError: any) => {
      alert(mutationError.response?.data?.message || 'Failed to update blog post');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/blog/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/blog/${id}/unpublish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });

  const resetForm = () => {
    setFormData({
      slug: '',
      coverImageUrl: '',
      tags: [],
      titleML: { en: '', de: '', tr: '' },
      summaryML: { en: '', de: '', tr: '' },
      contentML: { en: '', de: '', tr: '' },
      authorName: '',
      seo: {
        metaTitleML: { en: '', de: '', tr: '' },
        metaDescriptionML: { en: '', de: '', tr: '' },
        keywords: [],
      },
      isPublished: false,
    });
    setCoverImageFile(null);
    setCoverImagePreview('');
    setLangTabValue(0);
    setTagInput('');
    setKeywordInput('');
  };

  const handleOpenCreate = () => {
    setEditingPost(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (post: BlogPost) => {
    setEditingPost(post);
    setLangTabValue(0);
    setFormData({
      slug: post.slug,
      coverImageUrl: post.coverImageUrl || '',
      tags: post.tags || [],
      titleML: post.titleML || { en: '', de: '', tr: '' },
      summaryML: post.summaryML || { en: '', de: '', tr: '' },
      contentML: post.contentML || { en: '', de: '', tr: '' },
      authorName: post.authorName || '',
      seo: {
        metaTitleML: post.seo?.metaTitleML || { en: '', de: '', tr: '' },
        metaDescriptionML: post.seo?.metaDescriptionML || { en: '', de: '', tr: '' },
        keywords: post.seo?.keywords || [],
      },
      isPublished: post.isPublished,
    });
    setCoverImageFile(null);
    setCoverImagePreview(getFullImageUrl(post.coverImageUrl));
    setTagInput('');
    setKeywordInput('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPost(null);
    setCoverImageFile(null);
    if (coverImagePreview.startsWith('blob:')) URL.revokeObjectURL(coverImagePreview);
    setCoverImagePreview('');
  };

  const handleCoverImageUpload = (file: File) => {
    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };

  const handleCoverImageRemove = () => {
    setCoverImageFile(null);
    if (coverImagePreview.startsWith('blob:')) URL.revokeObjectURL(coverImagePreview);
    setCoverImagePreview('');
    setFormData((prev) => ({ ...prev, coverImageUrl: '' }));
  };

  const handleLanguageChange = (
    lang: string,
    field: 'titleML' | 'summaryML' | 'contentML' | 'metaTitleML' | 'metaDescriptionML',
    value: string,
  ) => {
    if (field === 'metaTitleML' || field === 'metaDescriptionML') {
      setFormData((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          [field]: {
            ...prev.seo[field],
            [lang]: value,
          },
        },
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.seo.keywords.includes(keywordInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: [...prev.seo.keywords, keywordInput.trim()],
        },
      }));
      setKeywordInput('');
    }
  };

  const handleSubmit = () => {
    if (!formData.titleML.en.trim()) {
      alert('English title is required');
      return;
    }
    if (!formData.contentML.en.trim()) {
      alert('English content is required');
      return;
    }
    if (!formData.slug.trim()) {
      alert('Slug is required');
      return;
    }
    if (!editingPost && !coverImageFile) {
      alert('Cover image is required');
      return;
    }

    const payload = {
      ...formData,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    };

    if (editingPost) {
      updateMutation.mutate({ id: editingPost._id, data: payload });
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
        Error loading blog posts. Please try again.
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          Blog Posts
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search posts..."
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
            New Post
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
                <TableCell>Cover</TableCell>
                <TableCell>Title (EN)</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Published</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts?.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: muiTheme.palette.text.secondary }}>
                    No blog posts found
                  </TableCell>
                </TableRow>
              )}
              {posts?.items?.map((post: BlogPost) => (
                <TableRow key={post._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                  <TableCell>
                    <Tooltip title={post.coverImageUrl || ''}>
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
                        {post.coverImageUrl ? (
                          <Box
                            component="img"
                            src={getFullImageUrl(post.coverImageUrl)}
                            alt={post.titleML?.en || 'Blog post'}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No img
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color: muiTheme.palette.text.primary }}>
                    <Typography noWrap sx={{ maxWidth: 220 }}>
                      {post.titleML?.en || 'No title'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={post.slug} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
                      {(post.tags || []).slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: muiTheme.palette.text.secondary }}>
                    {post.authorName || '-'}
                  </TableCell>
                  <TableCell>{getStatusChip(post.isPublished)}</TableCell>
                  <TableCell sx={{ color: muiTheme.palette.text.secondary }}>
                    {post.publishedAt ? format(new Date(post.publishedAt), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenEdit(post)} sx={{ '&:hover': { backgroundColor: hover } }}>
                      <Edit />
                    </IconButton>
                    {!post.isPublished ? (
                      <IconButton
                        size="small"
                        onClick={() => publishMutation.mutate(post._id)}
                        sx={{ color: accent, '&:hover': { backgroundColor: hover } }}
                      >
                        <Publish />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={() => unpublishMutation.mutate(post._id)} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <VisibilityOff />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this post?')) {
                          deleteMutation.mutate(post._id);
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
          count={posts?.total || 0}
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
        <DialogTitle>{editingPost ? 'Edit Blog Post' : 'Create Blog Post'}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: border }}>
          <Tabs value={langTabValue} onChange={(_event, value) => setLangTabValue(value)} sx={tabsSx}>
            <Tab label="English" />
            <Tab label="Deutsch" />
            <Tab label="Turkish" />
          </Tabs>

          {langTabValue === 0 && (
            <Grid container spacing={3} sx={{ pt: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Title (English)"
                  fullWidth
                  value={formData.titleML.en}
                  onChange={(event) => handleLanguageChange('en', 'titleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Slug"
                  fullWidth
                  value={formData.slug}
                  onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
                  helperText="URL-friendly name"
                  sx={fieldSx}
                  FormHelperTextProps={{ sx: { color: muiTheme.palette.text.secondary } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Summary (English)"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.summaryML.en}
                  onChange={(event) => handleLanguageChange('en', 'summaryML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Content (English)"
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.contentML.en}
                  onChange={(event) => handleLanguageChange('en', 'contentML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          )}

          {langTabValue === 1 && (
            <Grid container spacing={3} sx={{ pt: 3 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Title (German)"
                  fullWidth
                  value={formData.titleML.de}
                  onChange={(event) => handleLanguageChange('de', 'titleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Summary (German)"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.summaryML.de}
                  onChange={(event) => handleLanguageChange('de', 'summaryML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Content (German)"
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.contentML.de}
                  onChange={(event) => handleLanguageChange('de', 'contentML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          )}

          {langTabValue === 2 && (
            <Grid container spacing={3} sx={{ pt: 3 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Title (Turkish)"
                  fullWidth
                  value={formData.titleML.tr}
                  onChange={(event) => handleLanguageChange('tr', 'titleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Summary (Turkish)"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.summaryML.tr}
                  onChange={(event) => handleLanguageChange('tr', 'summaryML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Content (Turkish)"
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.contentML.tr}
                  onChange={(event) => handleLanguageChange('tr', 'contentML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
            </Grid>
          )}

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
              Post Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom color="text.primary">
                  Cover Image
                </Typography>
                <ImageUpload
                  onImageUpload={handleCoverImageUpload}
                  onImageRemove={handleCoverImageRemove}
                  currentImage={coverImagePreview}
                  label="upload cover image"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Author Name"
                  fullWidth
                  value={formData.authorName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, authorName: event.target.value }))}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom color="text.primary">
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    label="Add Tag"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddTag();
                      }
                    }}
                    sx={{ flex: 1, ...fieldSx }}
                  />
                  <Button variant="outlined" onClick={handleAddTag}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => setFormData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom sx={{ color: muiTheme.palette.primary.main }}>
                  SEO Settings
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Meta Title (English)"
                  fullWidth
                  value={formData.seo.metaTitleML.en}
                  onChange={(event) => handleLanguageChange('en', 'metaTitleML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Meta Description (English)"
                  fullWidth
                  value={formData.seo.metaDescriptionML.en}
                  onChange={(event) => handleLanguageChange('en', 'metaDescriptionML', event.target.value)}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom color="text.primary">
                  SEO Keywords
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    label="Add Keyword"
                    value={keywordInput}
                    onChange={(event) => setKeywordInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    sx={{ flex: 1, ...fieldSx }}
                  />
                  <Button variant="outlined" onClick={handleAddKeyword}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {formData.seo.keywords.map((keyword) => (
                    <Chip
                      key={keyword}
                      label={keyword}
                      onDelete={() =>
                        setFormData((prev) => ({
                          ...prev,
                          seo: {
                            ...prev.seo,
                            keywords: prev.seo.keywords.filter((item) => item !== keyword),
                          },
                        }))
                      }
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={formData.isPublished} onChange={(event) => setFormData((prev) => ({ ...prev, isPublished: event.target.checked }))} />}
                  label="Publish immediately"
                />
              </Grid>
            </Grid>
          </Box>
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

export default BlogPosts;
