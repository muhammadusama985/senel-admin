import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';

export type ProductVariant = {
  sku: string;
  stockQty: number;
  attributes: Record<string, string>;
  imageUrls?: string[];
};

interface VariantEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  uploadImage: (file: File) => Promise<string | null>;
}

const COLOR_NAME_BY_HEX: Record<string, string> = {
  '#000000': 'Black',
  '#ffffff': 'White',
  '#ff0000': 'Red',
  '#00ff00': 'Lime',
  '#0000ff': 'Blue',
  '#ffff00': 'Yellow',
  '#ffa500': 'Orange',
  '#800080': 'Purple',
  '#ffc0cb': 'Pink',
  '#a52a2a': 'Brown',
  '#808080': 'Gray',
  '#008000': 'Green',
  '#00ffff': 'Cyan',
  '#4b0082': 'Indigo',
  '#ffd700': 'Gold',
  '#c0c0c0': 'Silver',
};

const isColorAttribute = (key: string) => key.trim().toLowerCase() === 'color';
const colorNameFromHex = (hex: string) => COLOR_NAME_BY_HEX[hex.toLowerCase()] || hex.toUpperCase();
const colorHexFromValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const match = Object.entries(COLOR_NAME_BY_HEX).find(([, label]) => label.toLowerCase() === normalized);
  return match?.[0] || '#000000';
};

const VariantEditor: React.FC<VariantEditorProps> = ({ variants, onChange, uploadImage }) => {
  const muiTheme = useMuiTheme();
  const isLight = muiTheme.palette.mode === 'light';
  const border = muiTheme.palette.divider;
  const surface = muiTheme.palette.background.paper;
  const accent = muiTheme.palette.secondary.main;

  const updateVariant = (index: number, next: Partial<ProductVariant>) => {
    const nextVariants = [...variants];
    nextVariants[index] = { ...nextVariants[index], ...next };
    onChange(nextVariants);
  };

  const addVariant = () => {
    onChange([
      ...variants,
      {
        sku: `VAR-${String(variants.length + 1).padStart(3, '0')}`,
        stockQty: 0,
        attributes: {},
        imageUrls: [],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, currentIndex) => currentIndex !== index));
  };

  const addAttribute = (index: number) => {
    const nextVariants = [...variants];
    const currentAttributes = { ...(nextVariants[index].attributes || {}) };
    let placeholderKey = 'attribute';
    let counter = 1;
    while (Object.prototype.hasOwnProperty.call(currentAttributes, placeholderKey)) {
      counter += 1;
      placeholderKey = `attribute${counter}`;
    }
    currentAttributes[placeholderKey] = '';
    nextVariants[index].attributes = currentAttributes;
    onChange(nextVariants);
  };

  const renameAttribute = (index: number, oldKey: string, nextKey: string) => {
    const cleanKey = nextKey.trim();
    const nextVariants = [...variants];
    const currentAttributes = { ...(nextVariants[index].attributes || {}) };
    const currentValue = currentAttributes[oldKey] ?? '';
    delete currentAttributes[oldKey];
    currentAttributes[cleanKey || oldKey] = currentValue;
    nextVariants[index].attributes = currentAttributes;
    onChange(nextVariants);
  };

  const updateAttributeValue = (index: number, key: string, value: string) => {
    const nextVariants = [...variants];
    nextVariants[index].attributes = { ...(nextVariants[index].attributes || {}), [key]: value };
    onChange(nextVariants);
  };

  const removeAttribute = (index: number, key: string) => {
    const nextVariants = [...variants];
    const currentAttributes = { ...(nextVariants[index].attributes || {}) };
    delete currentAttributes[key];
    nextVariants[index].attributes = currentAttributes;
    onChange(nextVariants);
  };

  const handleVariantImages = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      const imageUrl = await uploadImage(file);
      if (imageUrl) uploadedUrls.push(imageUrl);
    }
    if (!uploadedUrls.length) return;
    updateVariant(index, {
      imageUrls: [...(variants[index].imageUrls || []), ...uploadedUrls],
    });
  };

  const removeVariantImage = (index: number, imageUrl: string) => {
    updateVariant(index, {
      imageUrls: (variants[index].imageUrls || []).filter((url) => url !== imageUrl),
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6">Attributes & Options</Typography>
          <Typography variant="body2" color="text.secondary">
            Add attribute titles inline. Their option values can be things like Blue, Yellow, Small, or Large, and each option can have its own images.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addVariant}>
          Add Option
        </Button>
      </Stack>

      {variants.map((variant, index) => (
        <Card
          key={`${variant.sku}-${index}`}
          variant="outlined"
          sx={{
            borderColor: border,
            backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.015 : 0.06),
          }}
        >
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Option {index + 1}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    One option can represent a single value like Blue, or a combination like Blue + Large, with its own images.
                  </Typography>
                </Box>
                <IconButton color="error" onClick={() => removeVariant(index)}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="SKU"
                    value={variant.sku}
                    onChange={(event) => updateVariant(index, { sku: event.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Stock Quantity"
                    value={variant.stockQty}
                    inputProps={{ min: 0 }}
                    onChange={(event) => updateVariant(index, { stockQty: Math.max(0, Number(event.target.value) || 0) })}
                  />
                </Grid>
              </Grid>

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">Attribute Titles & Option Values</Typography>
                  <Button size="small" variant="text" startIcon={<AddIcon />} onClick={() => addAttribute(index)}>
                    Add Attribute
                  </Button>
                </Stack>

                {Object.entries(variant.attributes || {}).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No attributes added yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {Object.entries(variant.attributes || {}).map(([key, value]) => (
                      <Grid container spacing={1.5} key={key} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            label="Attribute Title"
                            value={key}
                            onChange={(event) => renameAttribute(index, key, event.target.value)}
                          />
                        </Grid>
                        {isColorAttribute(key) ? (
                          <>
                            <Grid size={{ xs: 12, md: 3 }}>
                              <TextField
                                fullWidth
                                type="color"
                                label="Color"
                                value={colorHexFromValue(String(value || ''))}
                                onChange={(event) => updateAttributeValue(index, key, colorNameFromHex(event.target.value))}
                                sx={{
                                  '& .MuiInputBase-input': {
                                    padding: '0.6rem',
                                    minHeight: 42,
                                  },
                                }}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <TextField fullWidth label="Value" value={String(value || '')} InputProps={{ readOnly: true }} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 1 }}>
                              <Box
                                title={String(value || '')}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  border: `1px solid ${border}`,
                                  backgroundColor: colorHexFromValue(String(value || '')),
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
                                }}
                              />
                            </Grid>
                          </>
                        ) : (
                          <Grid size={{ xs: 12, md: 7 }}>
                            <TextField
                              fullWidth
                              label="Option Value"
                              value={String(value || '')}
                              placeholder={key.trim().toLowerCase() === 'size' ? 'e.g. Small, Medium, Large' : 'Enter option value'}
                              onChange={(event) => updateAttributeValue(index, key, event.target.value)}
                            />
                          </Grid>
                        )}
                        <Grid size={{ xs: 12, md: 1 }}>
                          <IconButton color="error" onClick={() => removeAttribute(index, key)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">Option Images (Optional)</Typography>
                  <Button component="label" size="small" variant="contained">
                    Upload Images
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        void handleVariantImages(index, event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                  </Button>
                </Stack>

                {(variant.imageUrls || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No option images added.
                  </Typography>
                ) : (
                  <Grid container spacing={1.5}>
                    {(variant.imageUrls || []).map((imageUrl) => (
                      <Grid key={imageUrl} size={{ xs: 6, md: 3 }}>
                        <Box sx={{ position: 'relative' }}>
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={`${variant.sku} option`}
                            sx={{
                              width: '100%',
                              height: 96,
                              objectFit: 'cover',
                              borderRadius: 2,
                              border: `1px solid ${border}`,
                              backgroundColor: surface,
                            }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeVariantImage(index, imageUrl)}
                            sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: surface }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default VariantEditor;
