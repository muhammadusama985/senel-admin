import React, { useMemo, useState } from 'react';
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

type AttributeGroup = {
  title: string;
  indexes: number[];
};

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

const getVariantAttributeTitle = (variant: ProductVariant, fallbackIndex: number) => {
  const keys = Object.keys(variant.attributes || {});
  return keys[0] || `Attribute ${fallbackIndex + 1}`;
};

const VariantEditor: React.FC<VariantEditorProps> = ({ variants, onChange, uploadImage }) => {
  const muiTheme = useMuiTheme();
  const isLight = muiTheme.palette.mode === 'light';
  const border = muiTheme.palette.divider;
  const surface = muiTheme.palette.background.paper;
  const [draftAttributeTitles, setDraftAttributeTitles] = useState<Record<string, string>>({});

  const attributeGroups = useMemo<AttributeGroup[]>(() => {
    const groups = new Map<string, number[]>();
    variants.forEach((variant, index) => {
      const title = getVariantAttributeTitle(variant, index);
      if (!groups.has(title)) {
        groups.set(title, []);
      }
      groups.get(title)?.push(index);
    });
    return Array.from(groups.entries()).map(([title, indexes]) => ({ title, indexes }));
  }, [variants]);

  const updateVariants = (updater: (current: ProductVariant[]) => ProductVariant[]) => {
    onChange(updater(variants));
  };

  const createOption = (attributeTitle: string, optionValue = ''): ProductVariant => ({
    sku: `VAR-${String(variants.length + 1).padStart(3, '0')}`,
    stockQty: 0,
    attributes: { [attributeTitle]: optionValue },
    imageUrls: [],
  });

  const addAttributeGroup = () => {
    let nextTitle = 'Attribute';
    let counter = 1;
    const usedTitles = new Set(attributeGroups.map((group) => group.title.toLowerCase()));
    while (usedTitles.has(nextTitle.toLowerCase())) {
      counter += 1;
      nextTitle = `Attribute ${counter}`;
    }

    updateVariants((current) => [...current, createOption(nextTitle)]);
    setDraftAttributeTitles((prev) => ({ ...prev, [nextTitle]: nextTitle }));
  };

  const renameAttributeGroup = (oldTitle: string, nextTitle: string) => {
    const cleanTitle = nextTitle.trim();
    if (!cleanTitle || cleanTitle === oldTitle) return;
    updateVariants((current) =>
      current.map((variant) => {
        const currentValue = variant.attributes?.[oldTitle];
        if (currentValue === undefined) return variant;
        const nextAttributes = { ...variant.attributes };
        delete nextAttributes[oldTitle];
        nextAttributes[cleanTitle] = currentValue;
        return { ...variant, attributes: nextAttributes };
      }),
    );
  };

  const removeAttributeGroup = (title: string) => {
    updateVariants((current) => current.filter((variant) => variant.attributes?.[title] === undefined));
    setDraftAttributeTitles((prev) => {
      const next = { ...prev };
      delete next[title];
      return next;
    });
  };

  const addOptionToGroup = (title: string) => {
    updateVariants((current) => [...current, createOption(title, isColorAttribute(title) ? 'Black' : '')]);
  };

  const removeOption = (variantIndex: number) => {
    updateVariants((current) => current.filter((_, index) => index !== variantIndex));
  };

  const updateOption = (variantIndex: number, updater: (variant: ProductVariant) => ProductVariant) => {
    updateVariants((current) => current.map((variant, index) => (index === variantIndex ? updater(variant) : variant)));
  };

  const handleOptionImages = async (variantIndex: number, files: FileList | null) => {
    if (!files?.length) return;
    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      const imageUrl = await uploadImage(file);
      if (imageUrl) uploadedUrls.push(imageUrl);
    }
    if (!uploadedUrls.length) return;
    updateOption(variantIndex, (variant) => ({
      ...variant,
      imageUrls: [...(variant.imageUrls || []), ...uploadedUrls],
    }));
  };

  const removeOptionImage = (variantIndex: number, imageUrl: string) => {
    updateOption(variantIndex, (variant) => ({
      ...variant,
      imageUrls: (variant.imageUrls || []).filter((url) => url !== imageUrl),
    }));
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6">Attributes & Options</Typography>
          <Typography variant="body2" color="text.secondary">
            Add one attribute title like Color or Size, then add many option names under it. Each option can have its own images.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addAttributeGroup}>
          Add Attribute
        </Button>
      </Stack>

      {attributeGroups.map((group) => {
        const titleDraft = draftAttributeTitles[group.title] ?? group.title;
        const colorMode = isColorAttribute(group.title);

        return (
          <Card
            key={group.title}
            variant="outlined"
            sx={{
              borderColor: border,
              backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.015 : 0.06),
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-end' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Attribute Title"
                    value={titleDraft}
                    placeholder="e.g. Color, Size"
                    onChange={(event) =>
                      setDraftAttributeTitles((prev) => ({
                        ...prev,
                        [group.title]: event.target.value,
                      }))
                    }
                    onBlur={() => {
                      const nextTitle = (draftAttributeTitles[group.title] ?? group.title).trim() || group.title;
                      renameAttributeGroup(group.title, nextTitle);
                      setDraftAttributeTitles((prev) => {
                        const next = { ...prev };
                        delete next[group.title];
                        if (nextTitle !== group.title) {
                          next[nextTitle] = nextTitle;
                        }
                        return next;
                      });
                    }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => addOptionToGroup(group.title)}>
                      Add Option
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => removeAttributeGroup(group.title)}>
                      Remove Attribute
                    </Button>
                  </Stack>
                </Stack>

                <Stack spacing={1.5}>
                  {group.indexes.map((variantIndex, optionOffset) => {
                    const option = variants[variantIndex];
                    const optionValue = option.attributes?.[group.title] ?? '';

                    return (
                      <Card key={`${group.title}-${variantIndex}`} variant="outlined" sx={{ borderColor: border, backgroundColor: surface }}>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle1" fontWeight={700}>
                                Option {optionOffset + 1}
                              </Typography>
                              <IconButton color="error" onClick={() => removeOption(variantIndex)}>
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Stack>

                            <Grid container spacing={1.5} alignItems="flex-end">
                              {colorMode ? (
                                <>
                                  <Grid size={{ xs: 12, md: 3 }}>
                                    <TextField fullWidth label="Option Name" value={String(optionValue || '')} placeholder="Color name" InputProps={{ readOnly: true }} />
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 2 }}>
                                    <TextField
                                      fullWidth
                                      type="color"
                                      label="Palette"
                                      value={colorHexFromValue(String(optionValue || ''))}
                                      onChange={(event) =>
                                        updateOption(variantIndex, (variant) => ({
                                          ...variant,
                                          attributes: { [group.title]: colorNameFromHex(event.target.value) },
                                        }))
                                      }
                                      sx={{
                                        '& .MuiInputBase-input': {
                                          padding: '0.6rem',
                                          minHeight: 42,
                                        },
                                      }}
                                    />
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 1 }}>
                                    <Box
                                      title={String(optionValue || '')}
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        border: `1px solid ${border}`,
                                        backgroundColor: colorHexFromValue(String(optionValue || '')),
                                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
                                      }}
                                    />
                                  </Grid>
                                </>
                              ) : (
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <TextField
                                    fullWidth
                                    label="Option Name"
                                    value={String(optionValue || '')}
                                    placeholder={group.title.trim().toLowerCase() === 'size' ? 'e.g. Small, Medium, Large' : 'e.g. Yellow, Blue'}
                                    onChange={(event) =>
                                      updateOption(variantIndex, (variant) => ({
                                        ...variant,
                                        attributes: { [group.title]: event.target.value },
                                      }))
                                    }
                                  />
                                </Grid>
                              )}

                              <Grid size={{ xs: 12, md: colorMode ? 4 : 4 }}>
                                <TextField
                                  fullWidth
                                  label="SKU"
                                  value={option.sku}
                                  onChange={(event) => updateOption(variantIndex, (variant) => ({ ...variant, sku: event.target.value }))}
                                />
                              </Grid>
                              <Grid size={{ xs: 12, md: colorMode ? 2 : 3 }}>
                                <Button component="label" fullWidth size="small" variant="contained">
                                  Upload
                                  <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(event) => {
                                      void handleOptionImages(variantIndex, event.target.files);
                                      event.currentTarget.value = '';
                                    }}
                                  />
                                </Button>
                              </Grid>
                            </Grid>

                            {(option.imageUrls || []).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                No images added for this option.
                              </Typography>
                            ) : (
                              <Grid container spacing={1.5}>
                                {(option.imageUrls || []).map((imageUrl) => (
                                  <Grid key={imageUrl} size={{ xs: 6, md: 3 }}>
                                    <Box sx={{ position: 'relative' }}>
                                      <Box
                                        component="img"
                                        src={imageUrl}
                                        alt={`${group.title} option`}
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
                                        onClick={() => removeOptionImage(variantIndex, imageUrl)}
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

export default VariantEditor;
