import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
interface PriceTier {
  minQty: number;
  unitPrice: number;
}
import { useTranslation } from 'react-i18next';

interface PriceTierEditorProps {
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
  moq?: number;
}

export const PriceTierEditor: React.FC<PriceTierEditorProps> = ({ tiers, onChange, moq }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Track which tier rows have been interacted with so we don't shout
  // "error" at the vendor mid-keystroke — the red border is only shown
  // once the vendor leaves the field (onBlur). The full submit-time
  // alerts (with messages) live in ProductForm.handleSubmit and are
  // unchanged.
  const [touched, setTouched] = useState<Record<number, boolean>>({});

  const addTier = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // New tiers start with empty minQty/unitPrice so the vendor types the
    // exact quantity and price they want — no auto-fill +50 logic.
    const newTiers = [...tiers, { minQty: 0, unitPrice: 0 }];
    onChange(newTiers);
  };

  const removeTier = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (tiers.length <= 1) return;
    onChange(tiers.filter((_, i) => i !== index));
    // Drop the touched flag for the removed row so indices stay clean.
    setTouched((prev) => {
      const next: Record<number, boolean> = {};
      Object.keys(prev).forEach((k) => {
        const ki = Number(k);
        if (ki < index) next[ki] = prev[ki];
        else if (ki > index) next[ki - 1] = prev[ki];
      });
      return next;
    });
  };

  const updateTier = (index: number, field: keyof PriceTier, value: number) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    // Intentionally no auto-sort on minQty here. Sorting while the vendor
    // is still typing makes the input row jump above/below on every
    // keystroke, which makes the field impossible to edit. Sorting and
    // validation are handled at submit time in ProductForm.handleSubmit
    // (alerts on save). The red border below is only shown after the
    // vendor leaves the field (onBlur) so it never appears mid-typing.
    onChange(newTiers);
  };

  const markTouched = (index: number) => {
    setTouched((prev) => (prev[index] ? prev : { ...prev, [index]: true }));
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text }}>{t('pricingTiersLabel')} *</label>

      <div
        style={{
          background: colors.cardBg,
          borderRadius: '8px',
          padding: '1rem',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 'bold', color: colors.text }}>{t('minQuantity')}</div>
          <div style={{ fontWeight: 'bold', color: colors.text }}>{t('unitPrice')} ({t('currencyLabel', 'Currency')})</div>
          <div></div>
        </div>

        {tiers.map((tier, index) => {
          // Only flag a row as "invalid" once the vendor has finished
          // editing it (touched). This way the red border never pops up
          // while they're still typing the number.
          const isInvalid =
            !!moq &&
            !!touched[index] &&
            ((index === 0 && (!tier.minQty || tier.minQty !== moq)) ||
              (index > 0 && !!tier.minQty && tier.minQty < moq));
          return (
          <div
            key={index}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '1rem', marginBottom: '0.5rem' }}
          >
            <input
              type="number"
              inputMode="numeric"
              value={tier.minQty || ""}
              placeholder="Enter min quantity"
              onChange={(e) => updateTier(index, 'minQty', parseInt(e.target.value, 10) || 0)}
              onBlur={() => markTouched(index)}
              min="0"
              title={
                index === 0 && moq && (!tier.minQty || tier.minQty !== moq)
                  ? `The first tier minimum quantity must be exactly the MOQ (${moq})`
                  : moq && tier.minQty && tier.minQty < moq
                    ? `Tier min quantity (${tier.minQty}) must be at least the MOQ (${moq})`
                    : ""
              }
              style={{
                padding: '0.5rem',
                border: isInvalid ? "1px solid #dc2626" : `1px solid ${colors.border}`,
                borderRadius: '4px',
                width: '100%',
                backgroundColor: colors.inputBg,
                color: colors.text,
                boxShadow: isInvalid ? "0 0 0 1px #dc2626" : undefined,
              }}
            />
            <input
              type="number"
              inputMode="decimal"
              value={tier.unitPrice || ""}
              placeholder="Enter unit price"
              onChange={(e) => updateTier(index, 'unitPrice', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              style={{
                padding: '0.5rem',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                width: '100%',
                backgroundColor: colors.inputBg,
                color: colors.text,
              }}
            />
            <button
              type="button"
              onClick={(e) => removeTier(index, e)}
              disabled={tiers.length <= 1}
              style={{
                backgroundColor: 'transparent',
                color: colors.accentRed,
                border: 'none',
                cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer',
                opacity: tiers.length <= 1 ? 0.5 : 1,
                fontSize: '1.2rem',
              }}
            >
              x
            </button>
          </div>
          );
        })}

        <button
          onClick={addTier}
          style={{
            background: colors.buttonGradient,
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem',
            width: '100%',
            marginTop: '0.5rem',
            cursor: 'pointer',
          }}
        >
          + {t('addPriceTier')}
        </button>

        <p style={{ fontSize: '0.85rem', color: colors.textMuted, marginTop: '0.5rem' }}>
          Set the minimum quantity and unit price for each tier you want to offer. Customers see the tier that matches their order quantity.
        </p>
      </div>
    </div>
  );
};
