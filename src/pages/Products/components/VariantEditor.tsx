import React, { useMemo, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
interface Variant {
  sku: string;
  stockQty: number;
  attributes: Record<string, string>;
  imageUrls?: string[];
}
import { useTranslation } from 'react-i18next';

interface VariantEditorProps {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  uploadImage?: (file: File) => Promise<string | null>;
  /** The combination whose tier prices are the canonical priceTiers values.
   *  Key format: joined selected values of all attributes (e.g. "Red|Medium"). */
  baseCombination?: string;
  onBaseCombinationChange?: (next: string) => void;
  /** Per-combination OFFSET from the base combination. Key: "<val1>|<val2>|..."
   *  Value: number (positive = surcharge over base, negative = discount).
   *  Missing entry = 0 (= same price as base). */
  combinationOffsets?: Record<string, number>;
  onCombinationOffsetsChange?: (next: Record<string, number>) => void;
  /** Minimum effective unit price (in product currency). Defaults to 0.01.
   *  Used to floor the final (tier + offset) price. */
  minEffectiveUnitPrice?: number;
  /** Price tiers — needed to compute the max-negative offset that won't
   *  drop the cheapest tier below the floor. */
  priceTiers?: Array<{ minQty: number; unitPrice: number }>;
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
const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};
const nearestColorNameFromHex = (hex: string) => {
  const target = hexToRgb(hex);
  let bestName = 'Black';
  let bestDistance = Number.POSITIVE_INFINITY;
  Object.entries(COLOR_NAME_BY_HEX).forEach(([candidateHex, candidateName]) => {
    const candidate = hexToRgb(candidateHex);
    const distance =
      (target.r - candidate.r) ** 2 +
      (target.g - candidate.g) ** 2 +
      (target.b - candidate.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = candidateName;
    }
  });
  return bestName;
};
const colorNameFromHex = (hex: string) => {
  const normalizedHex = hex.toUpperCase();
  const generalName = COLOR_NAME_BY_HEX[hex.toLowerCase()] || nearestColorNameFromHex(hex.toLowerCase());
  return `${generalName} (${normalizedHex})`;
};
const colorHexFromValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const hexMatch = normalized.match(/#([0-9a-f]{6})/i);
  if (hexMatch) return `#${hexMatch[1]}`.toLowerCase();
  const plainName = normalized.replace(/\s*\(#?[0-9a-f]{6}\)\s*/i, '').trim();
  const match = Object.entries(COLOR_NAME_BY_HEX).find(([, label]) => label.toLowerCase() === plainName);
  return match?.[0] || '#000000';
};

const getVariantAttributeTitle = (variant: Variant, fallbackIndex: number) => {
  const keys = Object.keys(variant.attributes || {});
  return keys[0] || `Attribute ${fallbackIndex + 1}`;
};

/**
 * Build the deterministic per-combination key used by combinationOffsets.
 * Sorts the attribute titles alphabetically so the same combination always
 * produces the same key regardless of declaration order.
 */
const buildCombinationKey = (variant: Variant): string => {
  const titles = Object.keys(variant.attributes || {}).sort();
  return titles
    .map((t) => {
      const v = (variant.attributes as Record<string, unknown>)[t];
      return v == null || v === '' ? '' : String(v);
    })
    .filter((p) => p !== '')
    .join('|');
};

export const VariantEditor: React.FC<VariantEditorProps> = ({
  variants,
  onChange,
  uploadImage,
  baseCombination = '',
  onBaseCombinationChange,
  combinationOffsets = {},
  onCombinationOffsetsChange,
  minEffectiveUnitPrice = 0.01,
  priceTiers = [],
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [draftAttributeTitles, setDraftAttributeTitles] = useState<Record<string, string>>({});

  // The "Attributes & Options" section must only show the per-option entries
  // the vendor created (each with exactly one attribute title + value +
  // SKU + images). Combination variants (full-attribute entries the
  // composer produces) must NOT be rendered as option cards here — they
  // live in the "Pricing — Compose combinations & offsets" list and the
  // customer-side variant lookup. We filter them out by keeping only
  // entries with exactly ONE attribute key.
  const singleAttributeVariants = useMemo(
    () => variants.filter((v) => Object.keys(v.attributes || {}).length === 1),
    [variants]
  );

  const attributeGroups = useMemo<AttributeGroup[]>(() => {
    const groups = new Map<string, number[]>();
    singleAttributeVariants.forEach((variant, index) => {
      const title = getVariantAttributeTitle(variant, index);
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)?.push(index);
    });
    return Array.from(groups.entries()).map(([title, indexes]) => ({ title, indexes }));
  }, [singleAttributeVariants]);

  const updateVariants = (updater: (current: Variant[]) => Variant[]) => {
    onChange(updater(variants));
  };

  const createOption = (attributeTitle: string, optionValue = ''): Variant => ({
    sku: `VAR-${String(variants.length + 1).padStart(3, '0')}`,
    attributes: { [attributeTitle]: optionValue },
    stockQty: 0,
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

  const updateOption = (variantIndex: number, updater: (variant: Variant) => Variant) => {
    updateVariants((current) => current.map((variant, index) => (index === variantIndex ? updater(variant) : variant)));
  };

  const handleOptionImages = async (variantIndex: number, files: FileList | null) => {
    if (!files || !uploadImage) return;
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

  const updateOptionName = (variantIndex: number, attrTitle: string, newValue: string) => {
    updateOption(variantIndex, (variant) => ({
      ...variant,
      attributes: { [attrTitle]: newValue },
    }));
  };

  // ------------------------------------------------------------------
  // Helpers for the new pricing model: base combination + per-combination
  // offsets. All per-variant SKUs are kept; per-variant stock is editable.
  // ------------------------------------------------------------------

  /**
   * Most-negative offset allowed before the cheapest tier's effective
   * unit price drops below minEffectiveUnitPrice.
   */
  const cheapestTierUnitPrice = (() => {
    let cheapest = Number.POSITIVE_INFINITY;
    for (const t of priceTiers || []) {
      const up = Number((t as any)?.unitPrice);
      if (Number.isFinite(up) && up < cheapest) cheapest = up;
    }
    return Number.isFinite(cheapest) ? cheapest : 0;
  })();
  const minOffsetAllowed =
    cheapestTierUnitPrice > 0
      ? Math.max(0, Number(minEffectiveUnitPrice) || 0) - cheapestTierUnitPrice
      : 0;

  /** Sanitize: keep only one leading +/-, digits, one decimal point. */
  const sanitizeNumberInput = (raw: string): string => {
    let cleaned = '';
    let sign = '';
    let hasDot = false;
    for (const ch of raw) {
      if ((ch === '+' || ch === '-') && sign === '' && cleaned === '') {
        sign = ch;
      } else if (ch >= '0' && ch <= '9') {
        cleaned += ch;
      } else if (ch === '.' && !hasDot) {
        cleaned += ch;
        hasDot = true;
      }
    }
    return sign + cleaned;
  };

  /** Validation for an offset value. Zero is ALLOWED (means "same as base"). */
  const validateOffset = (value: string): { valid: boolean; reason?: string } => {
    if (value === '' || value === '-' || value === '+' || value === '.' || value === '-.') {
      return { valid: true };
    }
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return { valid: false, reason: 'Not a number' };
    if (
      cheapestTierUnitPrice > 0 &&
      num < minOffsetAllowed
    ) {
      return {
        valid: false,
        reason: `Too low — would drop cheapest tier (${cheapestTierUnitPrice}) below the floor (${Math.max(0, Number(minEffectiveUnitPrice) || 0)}). Minimum is ${minOffsetAllowed.toFixed(2)}.`,
      };
    }
    return { valid: true };
  };


  // -- Composer state (replaces the per-combination table / base dropdown) --
  // one dropdown per attribute title, one offset input, one stock input,
  // one "set as base" toggle, and the list of saved combinations below.
  const [composerSelection, setComposerSelection] = useState<Record<string, string>>({});
  const [composerOffset, setComposerOffset] = useState('');
  const [composerStock, setComposerStock] = useState<string>('');
  const [composerIsBase, setComposerIsBase] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  /**
   * Look up the variant entry that represents a full combination (every
   * attribute key + value selected). Returns null if no such variant has
   * been created yet. Combination variants carry the stockQty that the
   * vendor set in the composer.
   */
  const findCombinationVariant = (combo: Record<string, string>): Variant | null => {
    const titles = Object.keys(combo).sort();
    if (titles.length === 0) return null;
    return (
      variants.find((v) => {
        const keys = Object.keys(v.attributes || {});
        if (keys.length !== titles.length) return false;
        return titles.every((t) => String(v.attributes?.[t] || '') === String(combo[t] || ''));
      }) || null
    );
  };

  /**
   * Upsert a combination variant entry. Returns a new variants array with
   * the combination variant present (and any orphan single-attribute
   * entries for the same combo removed to keep the data clean).
   */
  const upsertCombinationVariant = (
    combo: Record<string, string>,
    patch: Partial<Pick<Variant, 'stockQty' | 'sku'>>
  ): Variant[] => {
    const titles = Object.keys(combo).sort();
    const key = titles.map((t) => combo[t]).join('|');
    const existing = findCombinationVariant(combo);
    // Always keep every existing variant entry (including the per-option
    // single-attribute ones with their images). The previous "drop
    // overlapping single-attribute entries" rule was destroying the
    // per-option images the vendor had attached to each individual option,
    // and also hid the option itself from the Attributes & Options section
    // because the editor grouped variants by their first attribute key.
    // The customer's variant lookup already uses full-attribute matching
    // (`Object.entries(selectedAttributes).every(...)`), so it correctly
    // picks the combination entry over any single-attribute fallback.
    // Build / update the combination variant.
    const sku = patch.sku || existing?.sku || `VAR-${(variants.length + 1).toString().padStart(3, '0')}-${key.replace(/\|/g, '-')}`;
    const combinationVariant: Variant = {
      ...(existing || {}),
      sku,
      attributes: { ...combo },
      stockQty: patch.stockQty ?? existing?.stockQty ?? 0,
      imageUrls: existing?.imageUrls || [],
    };
    // Update the existing combination row in place (so we don't end up
    // with two entries that share the same SKU after an Edit + Save
    // round), otherwise append the new combination row.
    if (existing) {
      return variants.map((v) => {
        const vKeys = Object.keys(v.attributes || {});
        const isSameCombination =
          vKeys.length === titles.length &&
          titles.every(
            (t) => String(v.attributes?.[t] || '') === String(combo[t] || ''),
          );
        return isSameCombination ? combinationVariant : v;
      });
    }
    return [...variants, combinationVariant];
  };

  // Unique attribute titles (sorted alphabetically) and their option lists.
  const allAttributeTitles = useMemo(() => {
    const titles = new Set<string>();
    variants.forEach((v) => {
      Object.keys(v.attributes || {}).forEach((t) => {
        if (t) titles.add(t);
      });
    });
    return Array.from(titles).sort();
  }, [variants]);

  const attributeOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    allAttributeTitles.forEach((title) => {
      const opts = new Set<string>();
      // Only collect option values from single-attribute entries, so the
      // dropdowns in the composer are sourced from the per-option list above
      // (not from the full-combination rows).
      singleAttributeVariants.forEach((v) => {
        const val = v.attributes?.[title];
        if (val != null && String(val) !== '') opts.add(String(val));
      });
      map[title] = Array.from(opts).sort();
    });
    return map;
  }, [allAttributeTitles, singleAttributeVariants]);

  // Cartesian product of every attribute's options. Each entry is a
  // fully-specified combination like { Color: 'Blue', Size: 'Small' }. This is
  // what the vendor's composer keys target and what the saved-combinations list
  // iterates over. (The flat `variants` array only stores one attribute-value
  // per entry, not full combinations, so we can't iterate over it.)
  const allCombinations = useMemo(() => {
    const titles = allAttributeTitles;
    if (titles.length === 0) return [];
    const build = (idx: number, current: Record<string, string>): Array<Record<string, string>> => {
      if (idx === titles.length) return [current];
      const title = titles[idx];
      const options = attributeOptions[title] || [];
      if (options.length === 0) return build(idx + 1, current);
      const result: Array<Record<string, string>> = [];
      for (const opt of options) {
        result.push(...build(idx + 1, { ...current, [title]: opt }));
      }
      return result;
    };
    return build(0, {});
  }, [allAttributeTitles, attributeOptions]);

  // List of all combinations the vendor has explicitly priced (base or has
  // an explicit offset). Derived from `allCombinations` (the cross product),
  // not from the flat `variants` array. Stock is read from the matching
  // combination-variant entry in `variants`.
  const savedCombinations = useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      isBase: boolean;
      offset: number | undefined;
      stockQty: number;
    }> = [];
    for (const combo of allCombinations) {
      const titles = Object.keys(combo).sort();
      const key = titles.map((t) => combo[t]).join('|');
      const label = titles.map((t) => `${t}: ${combo[t]}`).join(' / ');
      const isBase = !!baseCombination && key === baseCombination;
      const offset = isBase ? 0 : combinationOffsets?.[key];
      const isPriced = isBase || offset !== undefined;
      if (!isPriced) continue;
      const variant = findCombinationVariant(combo);
      rows.push({ key, label, isBase, offset, stockQty: Number(variant?.stockQty || 0) });
    }
    rows.sort((a, b) => {
      if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [allCombinations, baseCombination, combinationOffsets, variants]);

  /** Save (or update) the combination currently in the composer. */
  const handleSaveCombination = () => {
    // Every attribute must have a selection.
    for (const title of allAttributeTitles) {
      if (!composerSelection[title]) return;
    }
    const titles = Object.keys(composerSelection).sort();
    const key = titles.map((t) => composerSelection[t]).join('|');
    const cleaned = sanitizeNumberInput(composerOffset);
    const validation = validateOffset(cleaned);

    // Compute the NEXT combinationOffsets object from the current prop value
    // (the parent handler treats the argument as a plain value, not a
    // function). Set as the new base combination when toggled.
    const nextOffsets = { ...(combinationOffsets || {}) };

    if (composerIsBase) {
      onBaseCombinationChange?.(key);
      delete nextOffsets[key]; // base has implicit offset 0
    } else {
      if (cleaned === '' || !validation.valid) return;
      const num = parseFloat(cleaned);
      nextOffsets[key] = num;
      if (baseCombination === key) onBaseCombinationChange?.('');
    }
    onCombinationOffsetsChange?.(nextOffsets);

    // Persist the per-combination stock as a real variant entry so the
    // customer side (variant lookup, cart validation, order checkout)
    // can match the combination by its full attribute set and read its
    // stockQty. Blank stock → 0.
    const stockNum = parseInt(sanitizeNumberInput(composerStock), 10);
    const safeStock = Number.isFinite(stockNum) && stockNum >= 0 ? stockNum : 0;
    onChange(upsertCombinationVariant(composerSelection, { stockQty: safeStock }));

    if (editingKey !== key) {
      setComposerOffset('');
      setComposerStock('');
      setComposerIsBase(false);
    } else {
      // Keep the stock in the composer while the user keeps editing the
      // same row so the input reflects the just-saved value.
      setComposerStock(String(safeStock));
    }
    setEditingKey(null);
  };

  /** Load an existing row back into the composer for editing. */
  const handleEditCombination = (key: string) => {
    const variant = variants.find((v) => buildCombinationKey(v) === key);
    if (!variant) return;
    setComposerSelection({ ...variant.attributes });
    const isBase = key === baseCombination;
    setComposerOffset(isBase ? '0' : String(combinationOffsets?.[key] ?? ''));
    setComposerStock(String(Number(variant.stockQty || 0)));
    setComposerIsBase(isBase);
    setEditingKey(key);
  };

  /** Remove a combination's price (and clear the base if it was the base). */
  const handleDeleteCombination = (key: string) => {
    if (key === baseCombination) onBaseCombinationChange?.('');
    const nextOffsets = { ...(combinationOffsets || {}) };
    delete nextOffsets[key];
    onCombinationOffsetsChange?.(nextOffsets);
    if (editingKey === key) {
      setComposerOffset('');
      setComposerIsBase(false);
      setEditingKey(null);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.text }}>{t('attributesOptions', 'Attributes & Options')}</label>
          <div style={{ color: colors.textMuted, fontSize: '0.9rem' }}>
            {t(
              'attributesOptionsHelp',
              'Add one attribute title like Color or Size, then add many option names under it. Prices are set later (after all variants are declared).'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={addAttributeGroup}
          style={{
            background: colors.buttonGradient,
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0.55rem 0.9rem',
            whiteSpace: 'nowrap',
          }}
        >
          + {t('addAttribute', 'Add Attribute')}
        </button>
      </div>

      {attributeGroups.map((group) => {
        const titleDraft = draftAttributeTitles[group.title] ?? group.title;
        const colorMode = isColorAttribute(group.title);

        return (
          <div
            key={group.title}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1rem',
              background: colors.cardBg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.9rem' }}>{t('attributeTitle', 'Attribute Title')}</label>
                <input
                  type="text"
                  value={titleDraft}
                  placeholder="e.g. Color, Size"
                  onChange={(e) =>
                    setDraftAttributeTitles((prev) => ({
                      ...prev,
                      [group.title]: e.target.value,
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
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => addOptionToGroup(group.title)}
                  style={{
                    background: colors.buttonGradient,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '0.55rem 0.85rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                    + {t('addOption', 'Add Option')}
                </button>
                <button
                  type="button"
                  onClick={() => removeAttributeGroup(group.title)}
                  style={{
                    background: 'transparent',
                    color: colors.accentRed,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '0.55rem 0.85rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                    {t('removeAttribute', 'Remove Attribute')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {group.indexes.map((variantIndex, optionOffset) => {
                const option = variants[variantIndex];
                const optionValue = String(option.attributes?.[group.title] ?? '');

                return (
                  <div
                    key={`${group.title}-${variantIndex}`}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: '10px',
                      padding: '0.9rem',
                      backgroundColor: colors.inputBg,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ color: colors.text, fontWeight: 600 }}>{t('option', 'Option')} {optionOffset + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeOption(variantIndex)}
                        style={{
                          background: 'transparent',
                          color: colors.accentRed,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem',
                        }}
                      >
                        x
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: colorMode ? '1.2fr 110px 70px 1fr auto' : '1.6fr 1fr auto',
                        gap: '0.75rem',
                        alignItems: 'end',
                        marginBottom: '0.9rem',
                      }}
                    >
                      {colorMode ? (
                        <>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.85rem' }}>{t('optionName', 'Option Name')}</label>
                            <input
                              type="text"
                              value={optionValue}
                              readOnly
                              placeholder="Color name"
                              style={{
                                width: '100%',
                                padding: '0.55rem',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '6px',
                                backgroundColor: colors.cardBg,
                                color: colors.text,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.85rem' }}>{t('palette', 'Palette')}</label>
                            <input
                              type="color"
                              value={colorHexFromValue(optionValue)}
                              onChange={(e) =>
                                updateOptionName(variantIndex, group.title, colorNameFromHex(e.target.value))
                              }
                              style={{
                                width: '100%',
                                height: '42px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '6px',
                                backgroundColor: colors.cardBg,
                              }}
                            />
                          </div>
                          <div
                            title={optionValue}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colorHexFromValue(optionValue),
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
                              justifySelf: 'center',
                            }}
                          />
                        </>
                      ) : (
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.85rem' }}>{t('optionName', 'Option Name')}</label>
                          <input
                            type="text"
                            value={optionValue}
                            placeholder={group.title.trim().toLowerCase() === 'size' ? 'e.g. Small, Medium, Large' : 'e.g. Yellow, Blue'}
                            onChange={(e) => updateOptionName(variantIndex, group.title, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              border: `1px solid ${colors.border}`,
                              borderRadius: '6px',
                              backgroundColor: colors.cardBg,
                              color: colors.text,
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.85rem' }}>{t('skuLabel')} *</label>
                        <input
                          type="text"
                          value={option.sku}
                          onChange={(e) => updateOption(variantIndex, (variant) => ({ ...variant, sku: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            backgroundColor: colors.cardBg,
                            color: colors.text,
                          }}
                        />
                      </div>


                      <label
                        style={{
                          background: colors.buttonGradient,
                          color: '#ffffff',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          padding: '0.65rem 0.8rem',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('attachments', 'Upload Images')}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            void handleOptionImages(variantIndex, e.target.files);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {(option.imageUrls || []).length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.75rem' }}>
                        {(option.imageUrls || []).map((imageUrl) => (
                          <div key={imageUrl} style={{ position: 'relative' }}>
                            <img
                              src={imageUrl}
                              alt={`${group.title} option`}
                              style={{ width: '100%', height: '88px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${colors.border}` }}
                            />
                            <button
                              type="button"
                              onClick={() => removeOptionImage(variantIndex, imageUrl)}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                border: 'none',
                                background: colors.buttonGradient,
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>{t('noImagesForOption', 'No images added for this option')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ============================================================
          BASE COMBINATION + PER-COMBINATION OFFSETS + STOCK
          (replaces the old per-option Adjust Price field)
          ============================================================ */}
            <div
        style={{
          marginTop: '1.5rem',
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '1rem',
        }}
      >
        <h4 style={{ color: colors.text, marginBottom: '0.5rem' }}>
          Pricing — Compose combinations & offsets
        </h4>
        <div style={{ color: colors.textMuted, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Pick one option from each attribute dropdown, enter its offset (positive = surcharge,
          negative = discount), then save. Tick &quot;Set as base combination&quot; for the
          combination whose tier prices are the canonical ones shown in the form above.
          Leave the offset blank when the combination has the same price as base.
        </div>

        {/* Composer: N dropdowns + offset + base toggle + save button. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.6rem',
            alignItems: 'flex-end',
            padding: '0.85rem',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            background: colors.inputBg,
            marginBottom: '0.75rem',
          }}
        >
          {allAttributeTitles.map((title) => (
            <div key={title} style={{ flex: '1 1 140px', minWidth: '140px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.75rem' }}>
                {title}
              </label>
              <select
                value={composerSelection[title] || ''}
                onChange={(e) =>
                  setComposerSelection((prev) => ({
                    ...prev,
                    [title]: e.target.value,
                  }))
                }
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  background: colors.cardBg,
                  color: colors.text,
                }}
              >
                <option value="">— pick {title} —</option>
                {(attributeOptions[title] || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.75rem' }}>
              Offset from base
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={composerOffset}
              placeholder={composerIsBase ? '0 (base = tier prices)' : 'e.g. -10 or +5'}
              onChange={(e) => setComposerOffset(sanitizeNumberInput(e.target.value))}
              disabled={composerIsBase}
              style={{
                width: '100%',
                padding: '0.55rem',
                border: `1px solid ${(composerOffset && !validateOffset(composerOffset).valid) ? colors.accentRed : colors.border}`,
                borderRadius: '6px',
                background: composerIsBase ? colors.cardBg : colors.inputBg,
                color: colors.text,
              }}
              title={
                composerIsBase
                  ? 'Base combination has implicit offset 0'
                  : 'Offset added to each tier price (positive = surcharge, negative = discount). Blank = same as base.'
              }
            />
          </div>

          <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: colors.textMuted, fontSize: '0.75rem' }}>
              Stock (units available)
            </label>
            <input
              type="number"
              inputMode='numeric'
              min='0'
              value={composerStock}
              placeholder={'e.g. 50'}
              onChange={(e) => setComposerStock(sanitizeNumberInput(e.target.value))}
              style={{
                width: '100%',
                padding: '0.55rem',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                backgroundColor: colors.inputBg,
                color: colors.text,
              }}
              title={'How many units of THIS combination are in stock. This is what customers see and what the cart validates against.'}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.5rem',
              color: colors.text,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            title="Tick to make THIS combination the base (its tier prices are the canonical ones)."
          >
            <input
              type="checkbox"
              checked={composerIsBase}
              onChange={(e) => setComposerIsBase(e.target.checked)}
            />
            Set as base
          </label>

          <button
            type="button"
            onClick={handleSaveCombination}
            disabled={
              allAttributeTitles.length === 0 ||
              allAttributeTitles.some((t) => !composerSelection[t]) ||
              (!composerIsBase && (composerOffset === '' || !validateOffset(composerOffset).valid))
            }
            style={{
              background: colors.buttonGradient,
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.6rem 1rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              opacity:
                allAttributeTitles.length === 0 ||
                allAttributeTitles.some((t) => !composerSelection[t]) ||
                (!composerIsBase && (composerOffset === '' || !validateOffset(composerOffset).valid))
                  ? 0.5
                  : 1,
            }}
          >
            {editingKey ? 'Update this combination' : 'Save this combination'}
          </button>
        </div>

        {/* Validation hint (visible only when user typed an invalid offset). */}
        {composerOffset && !composerIsBase && !validateOffset(composerOffset).valid && (
          <div style={{ color: colors.accentRed, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            {validateOffset(composerOffset).reason}
          </div>
        )}

        {/* Live reference: cheapest tier / floor. */}
        {cheapestTierUnitPrice > 0 && (
          <div style={{ marginBottom: '0.75rem', color: colors.textMuted, fontSize: '0.8rem' }}>
            Cheapest tier base price:{' '}
            <strong style={{ color: colors.text }}>{cheapestTierUnitPrice.toFixed(2)}</strong>
            {' · '}Minimum allowed offset:{' '}
            <strong style={{ color: colors.text }}>{minOffsetAllowed.toFixed(2)}</strong>
            {' '}(offset more negative than this would zero out the cheapest tier).
          </div>
        )}

        {/* Saved combinations list (the prices the vendor has entered). */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.55rem 0.8rem',
              background: colors.cardBg,
              color: '#999',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            Saved combinations ({savedCombinations.length})
          </div>
          {savedCombinations.length === 0 ? (
            <div style={{ padding: '1rem', color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' }}>
              No combinations priced yet. Use the composer above to set prices.
            </div>
          ) : (
            savedCombinations.map((row) => {
              const offsetValidation = row.isBase
                ? { valid: true }
                : validateOffset(String(row.offset ?? ''));
              const isEditing = editingKey === row.key;
              return (
                <div
                  key={row.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 0.9fr 1fr 1.1fr auto',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.8rem',
                    borderTop: `1px solid ${colors.border}`,
                    background: isEditing ? colors.inputBg : 'transparent',
                  }}
                >
                  <div style={{ color: colors.text, fontWeight: 500 }}>
                    {row.label}
                    {row.isBase && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          padding: '0.15rem 0.45rem',
                          background: colors.buttonGradient,
                          color: '#ffffff',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        BASE
                      </span>
                    )}
                  </div>
                  <div style={{ color: colors.text, fontSize: '0.9rem' }}>
                    {row.isBase ? (
                      <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                        0 (base = canonical tier prices)
                      </span>
                    ) : (
                      <span style={{ color: offsetValidation.valid ? colors.text : colors.accentRed }}>
                        {row.offset === undefined ? '—' : `${row.offset >= 0 ? '+' : ''}${row.offset}`}
                      </span>
                    )}
                  </div>
                  <div style={{ color: colors.text, fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>{row.stockQty}</span>
                    <span style={{ color: colors.textMuted, marginLeft: '0.25rem' }}>units</span>
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: '0.7rem' }}>
                    key: {row.key}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => handleEditCombination(row.key)}
                      style={{
                        background: 'transparent',
                        color: colors.textMuted,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCombination(row.key)}
                      style={{
                        background: 'transparent',
                        color: colors.accentRed,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
