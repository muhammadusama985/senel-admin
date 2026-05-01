import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import VariantEditor, { ProductVariant } from './components/VariantEditor';

interface Category {
  _id: string;
  name: string;
}

interface Vendor {
  _id: string;
  storeName: string;
}

const emptyTier = { minQty: 1, unitPrice: 0 };

const normalizeVendors = (payload: any): Vendor[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.vendors)) {
    return payload.vendors;
  }

  if (Array.isArray(payload?.vendors?.items)) {
    return payload.vendors.items;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (payload?.vendors && typeof payload.vendors === 'object') {
    return Object.values(payload.vendors).filter((item): item is Vendor => typeof item === 'object' && item !== null && '_id' in item);
  }

  return [];
};

const ProductCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    vendorId: '',
    country: '',
    currency: 'EUR',
    moq: 1,
    stockQty: 0,
    hasVariants: false,
    variants: [] as ProductVariant[],
    trackInventory: true,
    lowStockThreshold: 5,
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    autoApprove: true,
    isFeatured: false,
    requiresManualShipping: false,
    titleML: { en: '', de: '', tr: '' },
    descriptionML: { en: '', de: '', tr: '' },
    priceTiers: [{ ...emptyTier }],
    imageUrls: [] as string[],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get('/catalog/admin/categories');
      return Array.isArray(response.data?.categories) ? response.data.categories : [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['admin', 'vendors', 'all'],
    queryFn: async () => {
      const response = await api.get('/vendors/admin/vendors');
      return normalizeVendors(response.data);
    },
  });

  const vendorList = Array.isArray(vendors) ? vendors : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        title: form.titleML.en || form.title,
        description: form.descriptionML.en || form.description,
        vendorId: form.vendorId || undefined,
        stockQty: form.stockQty,
        variants: form.hasVariants
          ? form.variants.map((variant) => ({
              ...variant,
              stockQty: form.stockQty,
            }))
          : form.variants,
      };
      const response = await api.post('/products/admin/products', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      navigate(`/products/${data.product._id}`);
    },
    onError: (mutationError: any) => {
      setError(mutationError.response?.data?.message || t('products.failedCreate'));
    },
  });

  const tierValidationError = useMemo(() => {
    if (!form.priceTiers.length) {
      return t('products.atLeastOneTier');
    }

    const smallestTier = Math.min(...form.priceTiers.map((tier) => tier.minQty));
    if (form.moq > smallestTier) {
      return t('products.moqGreaterThanTier', { qty: smallestTier });
    }

    return '';
  }, [form.moq, form.priceTiers]);

  const variantValidationError = useMemo(() => {
    if (!form.hasVariants) return '';
    if (!form.variants.length) return t('products.variantRequired');
    const normalizedSkus = form.variants.map((variant) => String(variant.sku || '').trim().toUpperCase());
    if (normalizedSkus.some((sku) => !sku)) return t('products.variantSkuRequired');
    if (new Set(normalizedSkus).size !== normalizedSkus.length) return t('products.variantSkuUnique');
    const hasInvalidAttributes = form.variants.some((variant) =>
      Object.entries(variant.attributes || {}).some(([key, value]) => !String(key || '').trim() || !String(value || '').trim())
    );
    if (hasInvalidAttributes) return t('products.variantAttributesRequired');
    return '';
  }, [form.hasVariants, form.variants, t]);

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length >= 2 &&
      form.categoryId &&
      form.priceTiers.length > 0 &&
      form.priceTiers.every((tier) => tier.minQty > 0 && tier.unitPrice >= 0) &&
      !tierValidationError &&
      !variantValidationError
    );
  }, [form, tierValidationError, variantValidationError]);

  const updateField = (field: string, value: any) => {
    setForm((prev) => {
      if (field === 'stockQty' && prev.hasVariants) {
        return {
          ...prev,
          stockQty: value,
          variants: prev.variants.map((variant) => ({
            ...variant,
            stockQty: value,
          })),
        };
      }
      return { ...prev, [field]: value };
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

  const updateML = (field: 'titleML' | 'descriptionML', lang: 'en' | 'de' | 'tr', value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  };

  const updateTier = (index: number, key: 'minQty' | 'unitPrice', value: number) => {
    setForm((prev) => {
      const priceTiers = [...prev.priceTiers];
      priceTiers[index] = { ...priceTiers[index], [key]: value };
      return { ...prev, priceTiers };
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setUploadingImages(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('productImages', file));

      const response = await api.post('/products/admin/images/multiple', formData);
      const imageUrls = response.data.imageUrls || [];

      setForm((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...imageUrls],
      }));
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.message || t('products.failedUploadImages'));
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadVariantImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('productImage', file);
      const response = await api.post('/products/admin/images', formData);
      return response.data?.imageUrl || null;
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.message || t('products.failedUploadVariantImage'));
      return null;
    }
  };

  const removeImage = (imageUrl: string) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((url) => url !== imageUrl),
    }));
  };

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('products.createTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('products.createIntro')}
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {tierValidationError && <Alert severity="warning">{tierValidationError}</Alert>}
        {variantValidationError && <Alert severity="warning">{variantValidationError}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label={t('products.englishTitle')}
              value={form.titleML.en}
              onChange={(e) => {
                updateML('titleML', 'en', e.target.value);
                updateField('title', e.target.value);
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label={t('products.germanTitle')} value={form.titleML.de} onChange={(e) => updateML('titleML', 'de', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label={t('products.turkishTitle')} value={form.titleML.tr} onChange={(e) => updateML('titleML', 'tr', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label={t('products.englishDescription')}
              value={form.descriptionML.en}
              onChange={(e) => {
                updateML('descriptionML', 'en', e.target.value);
                updateField('description', e.target.value);
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth multiline minRows={4} label={t('products.germanDescription')} value={form.descriptionML.de} onChange={(e) => updateML('descriptionML', 'de', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth multiline minRows={4} label={t('products.turkishDescription')} value={form.descriptionML.tr} onChange={(e) => updateML('descriptionML', 'tr', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField select fullWidth label={t('products.category')} value={form.categoryId} onChange={(e) => updateField('categoryId', e.target.value)}>
              {categories.map((category: Category) => (
                <MenuItem key={category._id} value={category._id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField select fullWidth label={t('products.vendorOptional')} value={form.vendorId} onChange={(e) => updateField('vendorId', e.target.value)}>
              <MenuItem value="">{t('products.platformStorefront')}</MenuItem>
              {vendorList.map((vendor: Vendor) => (
                <MenuItem key={vendor._id} value={vendor._id}>
                  {vendor.storeName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField fullWidth label={t('products.country')} value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField select fullWidth label={t('products.currency')} value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
              <MenuItem value="EUR">EUR (Euro)</MenuItem>
              <MenuItem value="TRY">TRY (Turkish Lira)</MenuItem>
              <MenuItem value="USD">USD (US Dollar)</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="number"
              fullWidth
              label="MOQ"
              value={form.moq}
              onChange={(e) => updateMOQ(Number(e.target.value))}
              helperText={t('products.moqHelp')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField type="number" fullWidth label={t('products.stockQty')} value={form.stockQty} onChange={(e) => updateField('stockQty', Number(e.target.value))} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="number"
              fullWidth
              label="Low Stock Threshold"
              value={form.lowStockThreshold}
              onChange={(e) => updateField('lowStockThreshold', Math.max(0, Number(e.target.value) || 0))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="number"
              fullWidth
              label="Length (cm)"
              value={form.lengthCm}
              onChange={(e) => updateField('lengthCm', Math.max(0, Number(e.target.value) || 0))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="number"
              fullWidth
              label="Width (cm)"
              value={form.widthCm}
              onChange={(e) => updateField('widthCm', Math.max(0, Number(e.target.value) || 0))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="number"
              fullWidth
              label="Height (cm)"
              value={form.heightCm}
              onChange={(e) => updateField('heightCm', Math.max(0, Number(e.target.value) || 0))}
            />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{t('products.priceTiers')}</Typography>
            {form.priceTiers.map((tier, index) => (
              <Grid container spacing={2} key={`tier-${index}`}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label={t('products.minQuantity')}
                    value={tier.minQty}
                    onChange={(e) => updateTier(index, 'minQty', Number(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label={t('products.unitPrice')}
                    value={tier.unitPrice}
                    onChange={(e) => updateTier(index, 'unitPrice', Number(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Button
                    color="error"
                    variant="outlined"
                    fullWidth
                    disabled={form.priceTiers.length === 1}
                    onClick={() => updateField('priceTiers', form.priceTiers.filter((_, tierIndex) => tierIndex !== index))}
                  >
                    {t('products.remove')}
                  </Button>
                </Grid>
              </Grid>
            ))}
            <Button
              variant="text"
              onClick={() => updateField('priceTiers', [...form.priceTiers, { ...emptyTier, minQty: Math.max(form.moq, 1) }])}
            >
              {t('products.addTier')}
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Checkbox checked={form.hasVariants} onChange={(e) => updateField('hasVariants', e.target.checked)} />}
              label={t('products.hasAttributesOptions')}
            />
            {form.hasVariants ? (
              <VariantEditor
                variants={form.variants}
                onChange={(variants) =>
                  updateField(
                    'variants',
                    variants.map((variant) => ({
                      ...variant,
                      stockQty: form.stockQty,
                    })),
                  )
                }
                uploadImage={uploadVariantImage}
              />
            ) : null}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="h6">Product Images</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('products.uploadBeforeCreate')}
                </Typography>
              </Box>
              <Button variant="contained" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}>
                {uploadingImages ? t('products.uploading') : t('products.uploadImages')}
              </Button>
            </Stack>

            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />

            {uploadingImages && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  {t('products.uploadingProductImages')}
                </Typography>
              </Stack>
            )}

            {form.imageUrls.length > 0 && (
              <Grid container spacing={2}>
                {form.imageUrls.map((imageUrl) => (
                  <Grid key={imageUrl} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
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
                        }}
                      />
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
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

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControlLabel control={<Checkbox checked={form.trackInventory} onChange={(e) => updateField('trackInventory', e.target.checked)} />} label={t('products.trackInventory')} />
          <FormControlLabel control={<Checkbox checked={form.autoApprove} onChange={(e) => updateField('autoApprove', e.target.checked)} />} label={t('products.autoApprove')} />
          <FormControlLabel control={<Checkbox checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} />} label={t('products.featureHomepage')} />
          <FormControlLabel
            control={<Checkbox checked={form.requiresManualShipping} onChange={(e) => updateField('requiresManualShipping', e.target.checked)} />}
            label={t('products.manualShipping')}
          />
        </Stack>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate('/products')}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" disabled={!canSubmit || createMutation.isPending || uploadingImages} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? `${t('common.create')}...` : t('products.createAction')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ProductCreate;
