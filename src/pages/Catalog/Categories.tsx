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
  IconButton,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Add, Delete, Edit, Visibility, VisibilityOff } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

const Categories: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    sortOrder: 0,
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

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

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.patch(`/catalog/admin/categories/${id}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('catalog.failedCategoryStatus'));
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
    setFormData({ name: '', parentId: '', sortOrder: 0, isActive: true });
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setError(null);
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
                <Typography>{node.name}</Typography>
                <Chip label={t('catalog.sortLabel', { value: node.sortOrder })} size="small" variant="outlined" />
                {!node.isActive && <Chip label={t('catalog.inactive')} size="small" />}
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActiveMutation.mutate({ id: node._id, isActive: !node.isActive });
                  }}
                  disabled={toggleActiveMutation.isPending}
                  sx={{ '&:hover': { backgroundColor: hover } }}
                >
                  {node.isActive ? <VisibilityOff /> : <Visibility />}
                </IconButton>
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
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
          {t('catalog.addCategory')}
        </Button>
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
