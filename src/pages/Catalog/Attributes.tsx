import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Add, Delete, Edit, Save, Visibility, VisibilityOff } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

interface Attribute {
  code: string;
  name: string;
  type: 'select' | 'multi_select' | 'text' | 'number';
  options?: string[];
  isVariant?: boolean;
  isRequired?: boolean;
}

interface AttributeSet {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
  attributes: Attribute[];
}

const Attributes: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [editingAttributeSet, setEditingAttributeSet] = useState<AttributeSet | null>(null);
  const [editingAttributeIndex, setEditingAttributeIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optionsInput, setOptionsInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isActive: true,
    attributes: [] as Attribute[],
  });
  const [attributeForm, setAttributeForm] = useState<Attribute>({
    code: '',
    name: '',
    type: 'select',
    options: [],
    isVariant: false,
    isRequired: false,
  });

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const tableHeader = alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08);
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

  const selectSx = {
    color: muiTheme.palette.text.primary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accent },
  };

  const { data: attributeSets, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ['admin', 'attribute-sets'],
    queryFn: async () => {
      try {
        const response = await api.get('/catalog/admin/attribute-sets');
        return response.data.attributeSets || [];
      } catch (err: any) {
        setError(err.response?.data?.message || t('attributes.failedFetch'));
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/catalog/admin/attribute-sets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attribute-sets'] });
      handleCloseDialog();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('attributes.failedCreate'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/catalog/admin/attribute-sets/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attribute-sets'] });
      handleCloseDialog();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('attributes.failedUpdate'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/catalog/admin/attribute-sets/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attribute-sets'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('attributes.failedDelete'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.patch(`/catalog/admin/attribute-sets/${id}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attribute-sets'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('attributes.failedStatus'));
    },
  });

  const handleOpenCreate = () => {
    setEditingAttributeSet(null);
    setFormData({ name: '', code: '', isActive: true, attributes: [] });
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (attributeSet: AttributeSet) => {
    setEditingAttributeSet(attributeSet);
    setFormData({
      name: attributeSet.name,
      code: attributeSet.code,
      isActive: attributeSet.isActive,
      attributes: attributeSet.attributes || [],
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAttributeSet(null);
    setError(null);
  };

  const handleOpenAttributeDialog = (index?: number) => {
    if (index !== undefined) {
      const attr = formData.attributes[index];
      setEditingAttributeIndex(index);
      setAttributeForm({
        code: attr.code,
        name: attr.name,
        type: attr.type,
        options: attr.options || [],
        isVariant: attr.isVariant || false,
        isRequired: attr.isRequired || false,
      });
      setOptionsInput(attr.options?.join(', ') || '');
    } else {
      setEditingAttributeIndex(null);
      setAttributeForm({
        code: '',
        name: '',
        type: 'select',
        options: [],
        isVariant: false,
        isRequired: false,
      });
      setOptionsInput('');
    }
    setAttributeDialogOpen(true);
  };

  const handleCloseAttributeDialog = () => {
    setAttributeDialogOpen(false);
    setEditingAttributeIndex(null);
  };

  const handleSaveAttribute = () => {
    if (!attributeForm.code || attributeForm.code.length < 2) {
      alert(t('attributes.codeMin'));
      return;
    }
    if (!attributeForm.name || attributeForm.name.length < 2) {
      alert(t('attributes.nameMin'));
      return;
    }

    let options: string[] = [];
    if (attributeForm.type === 'select' || attributeForm.type === 'multi_select') {
      options = optionsInput
        .split(',')
        .map((option) => option.trim())
        .filter((option) => option.length > 0);

      if (options.length === 0) {
        alert(t('attributes.selectNeedsOptions'));
        return;
      }
    }

    const nextAttribute: Attribute = {
      code: attributeForm.code.toLowerCase(),
      name: attributeForm.name,
      type: attributeForm.type,
      ...(options.length > 0 ? { options } : {}),
      isVariant: attributeForm.isVariant || false,
      isRequired: attributeForm.isRequired || false,
    };

    const nextAttributes = [...formData.attributes];
    if (editingAttributeIndex !== null) {
      nextAttributes[editingAttributeIndex] = nextAttribute;
    } else {
      nextAttributes.push(nextAttribute);
    }

    setFormData((prev) => ({ ...prev, attributes: nextAttributes }));
    handleCloseAttributeDialog();
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || formData.name.length < 2) {
      setError(t('attributes.nameMin'));
      return;
    }
    if (!formData.code.trim() || formData.code.length < 2) {
      setError(t('attributes.codeMin'));
      return;
    }

    if (!editingAttributeSet && attributeSets?.some((set: AttributeSet) => set.code === formData.code.toLowerCase())) {
      setError(t('attributes.codeExists'));
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toLowerCase(),
      isActive: formData.isActive,
      attributes: formData.attributes.map((attr) => {
        const nextAttr: any = {
          code: attr.code.toLowerCase(),
          name: attr.name,
          type: attr.type,
        };
        if ((attr.type === 'select' || attr.type === 'multi_select') && attr.options?.length) {
          nextAttr.options = attr.options;
        }
        if (attr.isVariant) nextAttr.isVariant = true;
        if (attr.isRequired) nextAttr.isRequired = true;
        return nextAttr;
      }),
    };

    if (editingAttributeSet) {
      updateMutation.mutate({ id: editingAttributeSet._id, data: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const getAttributeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      select: t('attributes.singleSelect'),
      multi_select: t('attributes.multiSelect'),
      text: t('attributes.text'),
      number: t('attributes.number'),
    };
    return types[type] || type;
  };

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
        {t('attributes.errorLoading')}
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
          {t('attributes.title')}
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
          {t('attributes.newSet')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: surface, border: `1px solid ${border}` }}>
          {error}
        </Alert>
      )}

      {!attributeSets || attributeSets.length === 0 ? (
        <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
          {t('attributes.noSets')}
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
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
                <TableCell>{t('attributes.name')}</TableCell>
                <TableCell>{t('attributes.code')}</TableCell>
                <TableCell>{t('attributes.attributes')}</TableCell>
                <TableCell>{t('attributes.status')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attributeSets.map((set: AttributeSet) => (
                <TableRow key={set._id} hover sx={{ '&:hover': { backgroundColor: hover } }}>
                  <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                    <Typography fontWeight={500}>{set.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                    <Chip label={set.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {set.attributes?.map((attr, index) => (
                        <Tooltip key={`${set._id}-${index}`} title={`${attr.name} (${getAttributeTypeLabel(attr.type)})`}>
                          <Chip
                            label={attr.code}
                            size="small"
                            color={attr.isVariant ? 'primary' : 'default'}
                            variant={attr.isRequired ? 'filled' : 'outlined'}
                            sx={{
                              backgroundColor: attr.isVariant ? alpha(accent, 0.22) : undefined,
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${border}` }}>
                    <Chip label={set.isActive ? t('catalog.active') : t('catalog.inactive')} size="small" color={set.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center" sx={{ borderBottom: `1px solid ${border}` }}>
                    <IconButton
                      size="small"
                      onClick={() => toggleActiveMutation.mutate({ id: set._id, isActive: !set.isActive })}
                      sx={{ '&:hover': { backgroundColor: hover } }}
                    >
                      {set.isActive ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenEdit(set)} sx={{ '&:hover': { backgroundColor: hover } }}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (window.confirm(t('attributes.deleteSetConfirm'))) {
                          deleteMutation.mutate(set._id);
                        }
                      }}
                      sx={{ '&:hover': { backgroundColor: hover } }}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>{editingAttributeSet ? t('attributes.editSet') : t('attributes.createSet')}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: border }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('attributes.name')}
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                error={formData.name.length > 0 && formData.name.length < 2}
                helperText={formData.name.length > 0 && formData.name.length < 2 ? t('attributes.minChars') : ''}
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('attributes.code')}
                fullWidth
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                required
                error={formData.code.length > 0 && formData.code.length < 2}
                helperText={formData.code.length > 0 && formData.code.length < 2 ? t('attributes.minChars') : ''}
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
                label={t('catalog.active')}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1, borderColor: border }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: accent }}>
                  {t('attributes.attributes')}
                </Typography>
                <Button variant="outlined" startIcon={<Add />} onClick={() => handleOpenAttributeDialog()}>
                  {t('attributes.addAttribute')}
                </Button>
              </Box>

              {formData.attributes.length === 0 ? (
                <Alert severity="info" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
                  {t('attributes.noAttributesYet')}
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {formData.attributes.map((attr, index) => (
                    <Grid size={{ xs: 12 }} key={`${attr.code}-${index}`}>
                      <Card variant="outlined" sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                            <Box>
                              <Typography variant="subtitle1">
                                {attr.name} <Chip label={attr.code} size="small" variant="outlined" />
                              </Typography>
                              <Typography variant="caption" sx={{ color: muiTheme.palette.text.secondary }}>
                                {t('attributes.type')}: {getAttributeTypeLabel(attr.type)}
                              </Typography>
                              {attr.options && attr.options.length > 0 && (
                                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {attr.options.map((option, optionIndex) => (
                                    <Chip key={`${option}-${optionIndex}`} label={option} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              )}
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                {attr.isVariant && <Chip label={t('attributes.variant')} size="small" color="primary" />}
                                {attr.isRequired && <Chip label={t('attributes.required')} size="small" color="warning" />}
                              </Box>
                            </Box>
                            <Box>
                              <IconButton size="small" onClick={() => handleOpenAttributeDialog(index)} sx={{ '&:hover': { backgroundColor: hover } }}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  if (window.confirm(t('attributes.deleteAttributeConfirm'))) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      attributes: prev.attributes.filter((_, currentIndex) => currentIndex !== index),
                                    }));
                                  }
                                }}
                                sx={{ '&:hover': { backgroundColor: hover } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<Save />}
            disabled={
              !formData.name.trim() ||
              !formData.code.trim() ||
              formData.name.length < 2 ||
              formData.code.length < 2 ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={attributeDialogOpen}
        onClose={handleCloseAttributeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { backgroundColor: surface, border: `1px solid ${border}` } }}
      >
        <DialogTitle>{editingAttributeIndex !== null ? t('attributes.editAttribute') : t('attributes.addAttributeTitle')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('attributes.code')}
                fullWidth
                value={attributeForm.code}
                onChange={(e) => setAttributeForm({ ...attributeForm, code: e.target.value })}
                error={attributeForm.code.length > 0 && attributeForm.code.length < 2}
                helperText={attributeForm.code.length > 0 && attributeForm.code.length < 2 ? t('attributes.minChars') : ''}
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t('attributes.name')}
                fullWidth
                value={attributeForm.name}
                onChange={(e) => setAttributeForm({ ...attributeForm, name: e.target.value })}
                error={attributeForm.name.length > 0 && attributeForm.name.length < 2}
                helperText={attributeForm.name.length > 0 && attributeForm.name.length < 2 ? t('attributes.minChars') : ''}
                sx={fieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: muiTheme.palette.text.secondary }}>{t('attributes.type')}</InputLabel>
                <Select
                  value={attributeForm.type}
                  label={t('attributes.type')}
                  onChange={(e) => setAttributeForm({ ...attributeForm, type: e.target.value as any, options: [] })}
                  sx={selectSx}
                >
                  <MenuItem value="select">{t('attributes.singleSelect')}</MenuItem>
                  <MenuItem value="multi_select">{t('attributes.multiSelect')}</MenuItem>
                  <MenuItem value="text">{t('attributes.text')}</MenuItem>
                  <MenuItem value="number">{t('attributes.number')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {(attributeForm.type === 'select' || attributeForm.type === 'multi_select') && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('attributes.optionsComma')}
                  fullWidth
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                  helperText={t('attributes.optionsHelp')}
                  sx={fieldSx}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={attributeForm.isVariant} onChange={(e) => setAttributeForm({ ...attributeForm, isVariant: e.target.checked })} />}
                label={t('attributes.variantHelp')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={attributeForm.isRequired} onChange={(e) => setAttributeForm({ ...attributeForm, isRequired: e.target.checked })} />}
                label={t('attributes.required')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttributeDialog}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSaveAttribute}
            variant="contained"
            disabled={
              !attributeForm.code ||
              !attributeForm.name ||
              attributeForm.code.length < 2 ||
              attributeForm.name.length < 2
            }
          >
            {t('attributes.saveAttribute')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Attributes;
