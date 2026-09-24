const COUNTRY_ALIASES = new Map([
  ['INDIA', 'IN'], ['IN', 'IN'],
  ['UNITED KINGDOM', 'GB'], ['GREAT BRITAIN', 'GB'], ['UK', 'GB'], ['GB', 'GB'],
  ['UNITED STATES', 'US'], ['UNITED STATES OF AMERICA', 'US'], ['USA', 'US'], ['US', 'US'],
  ['CANADA', 'CA'], ['CA', 'CA'], ['AUSTRALIA', 'AU'], ['AU', 'AU'],
  ['NEW ZEALAND', 'NZ'], ['NZ', 'NZ'], ['SINGAPORE', 'SG'], ['SG', 'SG'],
  ['UNITED ARAB EMIRATES', 'AE'], ['UAE', 'AE'], ['AE', 'AE']
]);

export const normalizeCountryCode = (country) => {
  const normalized = String(country || '').trim().toUpperCase();
  if (!normalized) return null;
  return COUNTRY_ALIASES.get(normalized) || (/^[A-Z]{2}$/.test(normalized) ? normalized : null);
};

export const isPlanAvailableForBusiness = (plan, countryCode, orderMode) => {
  if (!plan?.is_active) return false;

  const category = String(plan.allowed_business_category || '').trim().toLowerCase();
  const normalizedOrderMode = String(orderMode || '').trim().toLowerCase();
  const categoryEligible = !category || category === 'all' || category === normalizedOrderMode;
  if (!categoryEligible) return false;

  const scope = plan.availability_scope || 'global';
  if (scope === 'global') return true;
  if (scope !== 'selected_countries' || !countryCode) return false;

  return (plan.allowed_countries || []).map(code => String(code).toUpperCase()).includes(countryCode);
};

export const getPlanMarketLabel = (plan) => {
  if ((plan.availability_scope || 'global') === 'global') return 'Global';
  const codes = (plan.allowed_countries || []).map(code => String(code).toUpperCase());
  if (codes.length === 1 && codes[0] === 'IN') return 'India only';
  return codes.join(', ');
};
