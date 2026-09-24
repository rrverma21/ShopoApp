export const SELLER_ROUTES = Object.freeze({ pos: '/pos/dashboard', digitalShop: '/digital-shop/dashboard', posPlans: '/membership-plans', digitalShopPlans: '/digital-shop/plans', hub: '/seller/dashboard' });
export const includesPos = plan => Array.isArray(plan?.features) && plan.features.some(f => { const s = String(f).toLowerCase(); return s === 'pos' || s.includes('point of sale') || s.includes('basic pos'); });
export const isTrialPlan = plan => String(plan?.name || '').trim().toUpperCase() === 'FREE STARTER';
export const accessState = (state, record = {}) => ({ state, canAccess: state === 'active', plan: record?.plan || null, startDate: record?.start_date || null, endDate: record?.end_date || null, isTrial: isTrialPlan(record?.plan) });
export function resolveSellerAccess({ memberships = [], profileMembership, subscriptions = [], entitlement, posError, historyError, loading = false, posLoading = loading, digitalShopLoading = loading, profile = {}, now = Date.now() }) {
  const valid = row => row.status === 'active' && row.plan?.is_active !== false && row.plan && (!row.start_date || Date.parse(row.start_date) <= now) && (!row.end_date || Date.parse(row.end_date) > now);
  const posHistory = memberships.filter(row => includesPos(row.plan));
  const current = [profileMembership, ...posHistory].filter(Boolean).find(row => includesPos(row.plan) && valid(row));
  const previous = memberships[0] || profileMembership;
  const pos = posLoading ? accessState('loading') : current ? accessState('active', current) : posError ? accessState('error') : accessState(previous ? 'expired' : 'never', previous);
  const legacy = memberships.find(row => Number(row.plan?.max_digital_products) > 0 && row.plan?.features?.includes('Online Store'));
  const dsHistory = subscriptions[0];
  const currentLegacy = memberships.find(row => valid(row) && Number(row.plan?.max_digital_products) > 0 && row.plan?.features?.includes('Online Store'));
  const dsRecord = entitlement?.entitled
    ? entitlement.capabilities
      ? { plan: { id: entitlement.capabilities.planId, name: entitlement.capabilities.planName }, start_date: entitlement.startsAt, end_date: entitlement.endsAt }
      : currentLegacy || {}
    : { plan: legacy?.plan, start_date: dsHistory?.starts_at || legacy?.start_date, end_date: dsHistory?.ends_at || legacy?.end_date };
  const digitalShop = entitlement?.loading ? accessState('loading') : entitlement?.error ? accessState('error') : entitlement?.entitled ? accessState('active', dsRecord) : digitalShopLoading ? accessState('loading') : historyError ? accessState('error') : accessState(dsHistory || legacy || Number(profile.digital_product_limit) > 0 ? 'expired' : 'never', dsRecord);
  digitalShop.capacity = entitlement?.capacity || 0;
  return { pos, digitalShop };
}
export function readLastSellerArea(userId, storage) {
  try { const value = userId && (storage || globalThis.localStorage)?.getItem(`shopoapp:seller:last-area:${userId}`); return ['pos', 'digital-shop'].includes(value) ? value : null; } catch { return null; }
}
export function rememberSellerArea(userId, area, storage) {
  if (!userId || !['pos', 'digital-shop'].includes(area)) return;
  try { (storage || globalThis.localStorage)?.setItem(`shopoapp:seller:last-area:${userId}`, area); } catch { /* Preference is optional. */ }
}
export function sellerDestination(access, preference) {
  if (access.pos.state === 'loading' || access.digitalShop.state === 'loading') return null;
  if (access.pos.state === 'error' || access.digitalShop.state === 'error') return SELLER_ROUTES.hub;
  if (access.pos.canAccess && access.digitalShop.canAccess) return preference === 'pos' ? SELLER_ROUTES.pos : preference === 'digital-shop' ? SELLER_ROUTES.digitalShop : SELLER_ROUTES.hub;
  return access.pos.canAccess ? SELLER_ROUTES.pos : access.digitalShop.canAccess ? SELLER_ROUTES.digitalShop : SELLER_ROUTES.hub;
}
export function productPresentation(product, state) {
  const pos = product === 'pos';
  const title = state === 'active' ? (pos ? 'ShopoApp POS' : 'Digital Shop') : state === 'expired' ? (pos ? 'POS membership expired' : 'Digital Shop subscription expired') : pos ? 'Add ShopoApp POS' : 'Launch your Digital Shop';
  const label = state === 'active' ? (pos ? 'Open POS' : 'Open Digital Shop') : state === 'expired' ? (pos ? 'Renew POS' : 'Renew Digital Shop') : pos ? 'View POS Plans' : 'View Digital Shop Plans';
  return { title, label, href: state === 'active' ? (pos ? SELLER_ROUTES.pos : SELLER_ROUTES.digitalShop) : pos ? SELLER_ROUTES.posPlans : SELLER_ROUTES.digitalShopPlans };
}
