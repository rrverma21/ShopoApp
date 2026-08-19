import { useLanguage } from '@/contexts/LanguageContext';

export const useMultilingualSEO = (pageType) => {
  const { t } = useLanguage();
  
  // Fallback logic is handled by the translation function in context if key is missing,
  // but we ensure keys exist for all supported languages.
  const title = t(`seo.${pageType}.title`);
  const description = t(`seo.${pageType}.description`);
  
  return { title, description };
};