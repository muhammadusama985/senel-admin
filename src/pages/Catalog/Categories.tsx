import React, { useState, useRef } from 'react';
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
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Add, CloudUpload, Delete, Edit } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { resolveMediaUrl } from '../../utils/media';

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string;
  children?: Category[];
}

const Categories: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    sortOrder: 0,
    isActive: true,
    imageUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputLabel-root': { color: muiTheme.palette.text.secondary },
  };

  const { data: categories, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/catalog/admin/categories');
        return response.data.categories || [];
      } catch (err: any) {
        setError(err.response?.data?.message || t('catalog.failedFetchCategories'));
        return [];
      }
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('categoryImage', file);
      
      const response = await api.post('/catalog/admin/categories/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      setSelectedImagePreview(null); // Clear preview once uploaded
      setUploadingImage(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to upload image');
      setSelectedImagePreview(null); // Clear preview on error
      setUploadingImage(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/catalog/admin/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      handleCloseDialog();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('catalog.failedCreateCategory'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/catalog/admin/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      handleCloseDialog();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('catalog.failedUpdateCategory'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/catalog/admin/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('catalog.failedDeleteCategory'));
    },
  });

  const buildCategoryTree = (cats: Category[]): Category[] => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    cats.forEach((cat) => {
      map.set(cat._id, { ...cat, children: [] });
    });

    cats.forEach((cat) => {
      const item = map.get(cat._id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(item);
      } else {
        roots.push(item);
      }
    });

    return roots;
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', parentId: '', sortOrder: 0, isActive: true, imageUrl: '' });
    setSelectedImagePreview(null);
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    const imageUrl = typeof category.imageUrl === 'string' ? category.imageUrl : '';
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      imageUrl: imageUrl,
    });
    setSelectedImagePreview(null);
    setError(null);
    setDialogOpen(true);
    // Reset file input for potential new upload
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload the image
      setUploadingImage(true);
      uploadImageMutation.mutate(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setSelectedImagePreview(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setError(t('catalog.nameRequired'));
      return;
    }

    const data = {
      name: formData.name.trim(),
      parentId: formData.parentId || null,
      sortOrder: Number(formData.sortOrder),
      isActive: formData.isActive,
      imageUrl: formData.imageUrl,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, data });
      return;
    }

    createMutation.mutate(data);
  };

  const renderTree = (nodes: Category[]) => (
    <>
      {nodes.map((node) => (
        <TreeItem
          key={node._id}
          itemId={node._id}
          sx={{
            '& .MuiTreeItem-content': {
              color: muiTheme.palette.text.primary,
              borderRadius: 1.5,
              '&:hover': {
                backgroundColor: hover,
              },
            },
            '& .MuiTreeItem-label': {
              color: muiTheme.palette.text.primary,
            },
          }}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {node.imageUrl && node.imageUrl.trim() && (
                  <img 
                    src={resolveMediaUrl(node.imageUrl) || ''} 
                    alt={node.name}
                    style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4 }}
                  />
                )}
                <Typography>{node.name}</Typography>
                <Chip label={t('catalog.sortLabel', { value: node.sortOrder })} size="small" variant="outlined" />
                {!node.isActive && <Chip label={t('catalog.inactive')} size="small" />}
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(node);
                  }}
                  sx={{ '&:hover': { backgroundColor: hover } }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('catalog.deleteCategoryConfirm'))) {
                      deleteMutation.mutate(node._id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  sx={{ '&:hover': { backgroundColor: hover } }}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          }
        >
          {node.children && renderTree(node.children)}
        </TreeItem>
      ))}
    </>
  );

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
        sx={{ m: 2, backgroundColor: surface, color: muiTheme.palette.text.primary, border: `1px solid ${border}` }}
        action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        }
      >
        {t('catalog.errorLoadingCategories')}
      </Alert>
    );
  }

  const treeData = buildCategoryTree(categories || []);

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          {t('catalog.categoriesTitle')}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button component={RouterLink} to="/categories/requests" variant="outlined">
            Vendor Requests
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
            {t('catalog.addCategory')}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
          {error}
        </Alert>
      )}

      {treeData.length === 0 ? (
        <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
          {t('catalog.noCategories')}
        </Alert>
      ) : (
        <Paper sx={{ p: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
          <SimpleTreeView
            slots={{
              collapseIcon: ExpandMoreIcon,
              expandIcon: ChevronRightIcon,
            }}
            sx={{ flexGrow: 1, maxWidth: '100%', overflowY: 'auto' }}
          >
            {renderTree(treeData)}
          </SimpleTreeView>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>{editingCategory ? t('catalog.editCategory') : t('catalog.createCategory')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('catalog.categoryName')}
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              error={!formData.name.trim()}
              helperText={!formData.name.trim() ? t('catalog.nameRequired') : ''}
              sx={fieldSx}
            />

            <TextField
              label={t('catalog.parentCategory')}
              fullWidth
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              select
              helperText={t('catalog.optional')}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            >
              <MenuItem value="">{t('catalog.noneTopLevel')}</MenuItem>
              {categories?.map((cat: Category) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={t('catalog.sortOrder')}
              type="number"
              fullWidth
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
              inputProps={{ min: 0 }}
              sx={fieldSx}
            />

            <FormControlLabel
              control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
              label={t('catalog.active')}
            />

            {/* Image Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: muiTheme.palette.text.secondary }}>
                {t('catalog.categoryImage')}
              </Typography>
              
              {(formData.imageUrl || selectedImagePreview) && !uploadingImage && (
                <Card sx={{ maxWidth: 200, position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="120"
                    image={(resolveMediaUrl(formData.imageUrl) || selectedImagePreview || '')}
                    alt="Category"
                    sx={{ objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={handleRemoveImage}
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
              
              {(uploadingImage || (!formData.imageUrl && !selectedImagePreview)) && (
                <Box
                  sx={{
                    border: `2px dashed ${border}`,
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: accent, backgroundColor: hover },
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      {selectedImagePreview && (
                        <Box
                          component="img"
                          src={selectedImagePreview}
                          alt="Preview"
                          sx={{ 
                            width: 120, 
                            height: 80,
                            objectFit: 'cover', 
                            borderRadius: 1,
                            opacity: 0.7
                          }}
                        />
                      )}
                      <CircularProgress size={24} sx={{ color: muiTheme.palette.primary.main }} />
                      <Typography variant="caption" color="text.secondary">
                        Uploading...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <CloudUpload sx={{ fontSize: 40, color: muiTheme.palette.text.secondary, mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('catalog.uploadImagePrompt')}
                      </Typography>
                    </>
                  )}
                </Box>
              )}
              
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories;