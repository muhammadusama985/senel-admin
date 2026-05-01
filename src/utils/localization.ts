export const normalizeUiLanguage = (language?: string) => {
  const base = String(language || 'en').toLowerCase().split('-')[0];
  return ['en', 'de', 'tr'].includes(base) ? (base as 'en' | 'de' | 'tr') : 'en';
};

export const pickLocalizedText = (
  value?: Partial<Record<'en' | 'de' | 'tr', string>> | null,
  language?: string,
) => {
  if (!value) return '';
  const lang = normalizeUiLanguage(language);
  return value[lang] || value.en || value.de || value.tr || '';
};
