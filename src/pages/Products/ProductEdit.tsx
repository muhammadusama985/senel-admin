import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import VariantEditor, { ProductVariant } from './components/VariantEditor';

type PriceTier = {
  minQty: number;
  unitPrice: number;
};

type ProductForm = {
  title: string;
  description: string;
  titleML: { en: string; de: string; tr: string };
  descriptionML: { en: string; de: string; tr: string };
  categoryId: string;
  country: string;
  currency: 'EUR' | 'TRY' | 'USD';
  moq: number;
  stockQty: number;
  hasVariants: boolean;
  variants: ProductVariant[];
  trackInventory: boolean;
  lowStockThreshold: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isFeatured: boolean;
  requiresManualShipping: boolean;
  imageUrls: string[];
  priceTiers: PriceTier[];
};

const emptyTier: PriceTier = { minQty: 1, unitPrice: 0 };

const createInitialForm = (): ProductForm => ({
  title: '',
  description: '',
  titleML: { en: '', de: '', tr: '' },
  descriptionML: { en: '', de: '', tr: '' },
  categoryId: '',
  country: '',
  currency: 'EUR',
  moq: 1,
  stockQty: 0,
  hasVariants: false,
  variants: [],
  trackInventory: true,
  lowStockThreshold: 5,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  isFeatured: false,
  requiresManualShipping: false,
  imageUrls: [],
  priceTiers: [{ ...emptyTier }],
});

const normalizeProductToForm = (product: any): ProductForm => ({
  title: product?.title || '',
  description: product?.description || '',
  titleML: {
    en: product?.titleML?.en || product?.title || '',
    de: product?.titleML?.de || '',
    tr: product?.titleML?.tr || '',
  },
  descriptionML: {
    en: product?.descriptionML?.en || product?.description || '',
    de: product?.descriptionML?.de || '',
    tr: product?.descriptionML?.tr || '',
  },
  categoryId:
    typeof product?.categoryId === 'string'
      ? product.categoryId
      : product?.categoryId?._id || '',
  country: product?.country || '',
  currency: product?.currency || 'EUR',
  moq: Number(product?.moq) || 1,
  stockQty: Number(product?.stockQty) || 0,
  hasVariants: Boolean(product?.hasVariants),
  variants: Array.isArray(product?.variants)
    ? product.variants.map((variant: any) => ({
        sku: variant?.sku || '',
        stockQty: Number(variant?.stockQty) || 0,
        attributes: variant?.attributes || {},
        imageUrls: Array.isArray(variant?.imageUrls) ? variant.imageUrls : [],
      }))
    : [],
  trackInventory: product?.trackInventory ?? true,
  lowStockThreshold: Number(product?.lowStockThreshold ?? 5),
  lengthCm: Number(product?.lengthCm) || 0,
  widthCm: Number(product?.widthCm) || 0,
  heightCm: Number(product?.heightCm) || 0,
  isFeatured: Boolean(product?.isFeatured),
  requiresManualShipping: Boolean(product?.requiresManualShipping),
  imageUrls: Array.isArray(product?.imageUrls) ? product.imageUrls : [],
  priceTiers:
    Array.isArray(product?.priceTiers) && product.priceTiers.length > 0
      ? product.priceTiers.map((tier: any) => ({
          minQty: Number(tier?.minQty) || 1,
          unitPrice: Number(tier?.unitPrice) || 0,
        }))
      : [{ ...emptyTier }],
});

const ProductEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<ProductForm>(createInitialForm);
  const [formError, setFormError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.14);
  const accent = muiTheme.palette.secondary.main;
  const muted = muiTheme.palette.text.secondary;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: muiTheme.palette.text.primary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: muiTheme.palette.primary.main },
    },
    '& .MuiInputLabel-root': { color: muted },
    '& .MuiInputLabel-root.Mui-focused': { color: muiTheme.palette.primary.main },
    '& .MuiFormHelperText-root': { color: muted },
  };

  const selectSx = {
    color: muiTheme.palette.text.primary,
    backgroundColor: surface,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: muiTheme.palette.primary.main },
    '& .MuiSvgIcon-root': { color: muiTheme.palette.text.primary },
  };

  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['admin', 'products', id, 'edit'],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.get(`/products/admin/products/${id}`);
      return response.data.product;
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/admin/categories');
      return Array.isArray(response.data?.categories) ? response.data.categories : [];
    },
  });

  useEffect(() => {
    if (product) {
      setForm(normalizeProductToForm(product));
      setFormError('');
      setUploadError('');
    }
  }, [product]);

  const tierValidationError = useMemo(() => {
    if (!form.priceTiers.length) {
      return 'At least one price tier is required.';
    }

    if (form.priceTiers.some((tier) => tier.minQty < 1 || tier.unitPrice < 0)) {
      return 'Each price tier must have a valid minimum quantity and price.';
    }

    const smallestTier = Math.min(...form.priceTiers.map((tier) => tier.minQty));
    if (form.moq > smallestTier) {
      return `MOQ cannot be greater than the smallest tier minimum quantity (${smallestTier}).`;
    }

    return '';
  }, [form.moq, form.priceTiers]);

  const variantValidationError = useMemo(() => {
    if (!form.hasVariants) return '';
    if (!form.variants.length) return 'Please add at least one variant.';
    const normalizedSkus = form.variants.map((variant) => String(variant.sku || '').trim().toUpperCase());
    if (normalizedSkus.some((sku) => !sku)) return 'Each variant must include a SKU.';
    if (new Set(normalizedSkus).size !== normalizedSkus.length) return 'Variant SKUs must be unique.';
    const hasInvalidAttributes = form.variants.some((variant) =>
      Object.entries(variant.attributes || {}).some(([key, value]) => !String(key || '').trim() || !String(value || '').trim())
    );
    if (hasInvalidAttributes) return 'Each variant attribute must include both a name and a value.';
    return '';
  }, [form.hasVariants, form.variants]);

  const updateField = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm((prev) => {
      if (field === 'stockQty' && prev.hasVariants) {
        return {
          ...prev,
          stockQty: value as number,
          variants: prev.variants.map((variant) => ({
            ...variant,
            stockQty: Number(value) || 0,
          })),
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const updateML = (field: 'titleML' | 'descriptionML', lang: 'en' | 'de' | 'tr', value: string) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: {
          ...prev[field],
          [lang]: value,
        },
      };

      if (field === 'titleML' && lang === 'en') {
        next.title = value;
      }

      if (field === 'descriptionML' && lang === 'en') {
        next.description = value;
      }

      return next;
    });
  };

  const updateMOQ = (value: number) => {
    setForm((prev) => {
      const moq = Number.isFinite(value) && value > 0 ? value : 1;
      const priceTiers = prev.priceTiers.map((tier, index) =>
        index === 0 && tier.minQty < moq ? { ...tier, minQty: moq } : tier
      );
      return { ...prev, moq, priceTiers };
    });
  };

  const updateTier = (index: number, key: keyof PriceTier, value: number) => {
    setForm((prev) => {
      const priceTiers = [...prev.priceTiers];
      priceTiers[index] = { ...priceTiers[index], [key]: value };
      return { ...prev, priceTiers };
    });
  };

  const addTier = () => {
    setForm((prev) => ({
      ...prev,
      priceTiers: [...prev.priceTiers, { ...emptyTier, minQty: Math.max(prev.moq, 1) }],
    }));
  };

  const removeTier = (index: number) => {
    setForm((prev) => ({
      ...prev,
      priceTiers: prev.priceTiers.length === 1 ? prev.priceTiers : prev.priceTiers.filter((_, tierIndex) => tierIndex !== index),
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setUploadingImages(true);
    setUploadError('');

    try {
      const imageFormData = new FormData();
      files.forEach((file) => imageFormData.append('productImages', file));
      const response = await api.post('/products/admin/images/multiple', imageFormData);
      const nextUrls = Array.isArray(response.data?.imageUrls) ? response.data.imageUrls : [];
      setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ...nextUrls] }));
    } catch (error: any) {
      setUploadError(error.response?.data?.message || 'Failed to upload product images.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadVariantImage = async (file: File): Promise<string | null> => {
    try {
      const imageFormData = new FormData();
      imageFormData.append('productImage', file);
      const response = await api.post('/products/admin/images', imageFormData);
      return response.data?.imageUrl || null;
    } catch (error: any) {
      setUploadError(error.response?.data?.message || 'Failed to upload variant image.');
      return null;
    }
  };

  const removeImage = (imageUrl: string) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((url) => url !== imageUrl),
    }));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.titleML.en || form.title,
        description: form.descriptionML.en || form.description,
        titleML: form.titleML,
        descriptionML: form.descriptionML,
        categoryId: form.categoryId,
        country: form.country,
        currency: form.currency,
        moq: Number(form.moq),
        stockQty: Number(form.stockQty),
        isFeatured: form.isFeatured,
        requiresManualShipping: form.requiresManualShipping,
        trackInventory: form.trackInventory,
        lowStockThreshold: Number(form.lowStockThreshold),
        hasVariants: form.hasVariants,
        variants: form.hasVariants
          ? form.variants.map((variant) => ({
              ...variant,
              stockQty: Number(form.stockQty),
            }))
          : form.variants,
        lengthCm: Number(form.lengthCm),
        widthCm: Number(form.widthCm),
        heightCm: Number(form.heightCm),
        imageUrls: form.imageUrls,
        priceTiers: form.priceTiers.map((tier) => ({
          minQty: Number(tier.minQty),
          unitPrice: Number(tier.unitPrice),
        })),
      };

      const response = await api.patch(`/products/admin/products/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', id] });
      navigate(`/products/${id}`);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.message || error.message || 'Failed to update product.');
    },
  });

  const handleSubmit = () => {
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Product title is required.');
      return;
    }

    if (!form.categoryId) {
      setFormError('Please select a category.');
      return;
    }

    if (tierValidationError) {
      setFormError(tierValidationError);
      return;
    }

    if (variantValidationError) {
      setFormError(variantValidationError);
      return;
    }

    updateMutation.mutate();
  };

  if (productLoading || categoriesLoading) {
    return <CircularProgress sx={{ m: 4 }} />;
  }

  if (productError || !product) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load the product editor.
      </Alert>
    );
  }

  return (
    <Paper className="page-shell" sx={{ p: 3, backgroundColor: surface, border: `1px solid ${border}` }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => navigate(`/products/${id}`)} sx={{ color: muiTheme.palette.text.primary, '&:hover': { backgroundColor: hover } }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4">Edit Product</Typography>
              <Typography variant="body2" color="text.secondary">
                Update product details, pricing, and media without leaving the admin workflow.
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => navigate(`/products/${id}`)}>
              Cancel
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={updateMutation.isPending || uploadingImages}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Box>

        {(formError || uploadError || tierValidationError || variantValidationError) && (
          <Stack spacing={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
            {!formError && tierValidationError && <Alert severity="warning">{tierValidationError}</Alert>}
            {!formError && variantValidationError && <Alert severity="warning">{variantValidationError}</Alert>}
          </Stack>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: surface, borderColor: border }}>
                <Stack spacing={2}>
                  <Typography variant="h6">Content</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="English Title"
                        value={form.titleML.en}
                        onChange={(event) => updateML('titleML', 'en', event.target.value)}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="German Title" value={form.titleML.de} onChange={(event) => updateML('titleML', 'de', event.target.value)} sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Turkish Title" value={form.titleML.tr} onChange={(event) => updateML('titleML', 'tr', event.target.value)} sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        label="English Description"
                        value={form.descriptionML.en}
                        onChange={(event) => updateML('descriptionML', 'en', event.target.value)}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        label="German Description"
                        value={form.descriptionML.de}
                        onChange={(event) => updateML('descriptionML', 'de', event.target.value)}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        label="Turkish Description"
                        value={form.descriptionML.tr}
                        onChange={(event) => updateML('descriptionML', 'tr', event.target.value)}
                        sx={fieldSx}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: surface, borderColor: border }}>
                <Stack spacing={2}>
                  <Typography variant="h6">Commercial Settings</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: muted }}>Category</InputLabel>
                        <Select value={form.categoryId} label="Category" onChange={(event) => updateField('categoryId', event.target.value)} sx={selectSx}>
                          {categories.map((category: any) => (
                            <MenuItem key={category._id} value={category._id}>
                              {category.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="Country" value={form.country} onChange={(event) => updateField('country', event.target.value)} sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField select fullWidth label="Currency" value={form.currency} onChange={(event) => updateField('currency', event.target.value as ProductForm['currency'])} sx={fieldSx}>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="TRY">TRY</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="MOQ"
                        value={form.moq}
                        onChange={(event) => updateMOQ(Number(event.target.value))}
                        inputProps={{ min: 1 }}
                        helperText="MOQ must not exceed the smallest tier."
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Stock Quantity"
                        value={form.stockQty}
                        onChange={(event) => updateField('stockQty', Math.max(0, Number(event.target.value) || 0))}
                        inputProps={{ min: 0 }}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Low Stock Threshold"
                        value={form.lowStockThreshold}
                        onChange={(event) => updateField('lowStockThreshold', Math.max(0, Number(event.target.value) || 0))}
                        inputProps={{ min: 0 }}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Length (cm)"
                        value={form.lengthCm}
                        onChange={(event) => updateField('lengthCm', Math.max(0, Number(event.target.value) || 0))}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Width (cm)"
                        value={form.widthCm}
                        onChange={(event) => updateField('widthCm', Math.max(0, Number(event.target.value) || 0))}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={fieldSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Height (cm)"
                        value={form.heightCm}
                        onChange={(event) => updateField('heightCm', Math.max(0, Number(event.target.value) || 0))}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={fieldSx}
                      />
                    </Grid>
                  </Grid>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <FormControlLabel control={<Checkbox checked={form.hasVariants} onChange={(event) => updateField('hasVariants', event.target.checked)} />} label="Has Attributes & Options" />
                    <FormControlLabel control={<Checkbox checked={form.isFeatured} onChange={(event) => updateField('isFeatured', event.target.checked)} />} label="Featured Product" />
                    <FormControlLabel
                      control={<Checkbox checked={form.trackInventory} onChange={(event) => updateField('trackInventory', event.target.checked)} />}
                      label="Track Inventory"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={form.requiresManualShipping} onChange={(event) => updateField('requiresManualShipping', event.target.checked)} />}
                      label="Manual Shipping"
                    />
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: surface, borderColor: border }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="h6">Price Tiers</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Keep the first tier aligned with the MOQ and make sure each tier has a valid price.
                      </Typography>
                    </Box>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addTier}>
                      Add Tier
                    </Button>
                  </Box>

                  {form.priceTiers.map((tier, index) => (
                    <Card key={`tier-${index}`} variant="outlined" sx={{ backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.015 : 0.06), borderColor: border }}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid size={{ xs: 12, md: 5 }}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Minimum Quantity"
                              value={tier.minQty}
                              onChange={(event) => updateTier(index, 'minQty', Math.max(1, Number(event.target.value) || 1))}
                              inputProps={{ min: 1 }}
                              sx={fieldSx}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 5 }}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Unit Price"
                              value={tier.unitPrice}
                              onChange={(event) => updateTier(index, 'unitPrice', Math.max(0, Number(event.target.value) || 0))}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={fieldSx}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 2 }}>
                            <Button
                              fullWidth
                              color="error"
                              variant="outlined"
                              startIcon={<RemoveCircleOutlineIcon />}
                              disabled={form.priceTiers.length === 1}
                              onClick={() => removeTier(index)}
                            >
                              Remove
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Paper>

              {form.hasVariants ? (
                <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: surface, borderColor: border }}>
                  <VariantEditor
                    variants={form.variants}
                    onChange={(variants) =>
                      updateField(
                        'variants',
                        variants.map((variant) => ({
                          ...variant,
                          stockQty: Number(form.stockQty) || 0,
                        })),
                      )
                    }
                    uploadImage={uploadVariantImage}
                  />
                </Paper>
              ) : null}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper variant="outlined" sx={{ p: 2.5, backgroundColor: surface, borderColor: border }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography variant="h6">Images</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload product images and remove outdated ones here.
                    </Typography>
                  </Box>
                  <Button variant="contained" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}>
                    {uploadingImages ? 'Uploading...' : 'Upload'}
                  </Button>
                </Box>

                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />

                {uploadingImages && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Uploading product images...
                    </Typography>
                  </Stack>
                )}

                {form.imageUrls.length === 0 ? (
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: `1px dashed ${border}`,
                      backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.02 : 0.05),
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No images added yet.
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {form.imageUrls.map((imageUrl) => (
                      <Grid key={imageUrl} size={{ xs: 12 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: surface, borderColor: border }}>
                          <Box
                            component="img"
                            src={imageUrl}
                            alt="Product preview"
                            sx={{
                              width: '100%',
                              height: 180,
                              objectFit: 'cover',
                              borderRadius: 2,
                              display: 'block',
                              mb: 1,
                              backgroundColor: alpha(muiTheme.palette.text.primary, isLight ? 0.04 : 0.08),
                            }}
                          />
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', flex: 1 }}>
                              {imageUrl.split('/').pop()}
                            </Typography>
                            <IconButton color="error" onClick={() => removeImage(imageUrl)}>
                              <DeleteOutlineIcon />
                            </IconButton>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );
};

export default ProductEdit;
