import { isPlanAvailableForBusiness } from './membershipEligibility.js';

export const DEFAULT_BILLING_CYCLE = 'annual';
export const FEATURE_LABELS = {
  cart_enabled: 'Customer cart', cod_orders_enabled: 'Cash on delivery',
  discounts_enabled: 'Discounts', local_shops_enabled: 'Local Shops listing',
};
export const LOCKED_OFFERS = {
  starter: { activation_fee: 999, monthly_price: 199, annual_price: 1999, included_product_limit: 100 },
  business: { activation_fee: 1999, monthly_price: 299, annual_price: 2999, included_product_limit: 300 },
  pro: { activation_fee: 4999, monthly_price: 499, annual_price: 4999, included_product_limit: 750 },
};
export const tierKey = plan => [plan?.code, plan?.name].map(v => String(v || '').trim().toLowerCase()).find(v => Object.hasOwn(LOCKED_OFFERS, v));
export const isRecommendedPlan = plan => tierKey(plan) === 'business';
export const cycleLabel = cycle => cycle === 'annual' ? 'year' : 'month';
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export function toPaise(value) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter a non-negative price with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 999999999999) throw new Error('Price exceeds the supported range.');
  return result;
}

export function activationState(account) {
  const status = account?.activation_fee_status;
  return ['due', 'paid', 'waived', 'unresolved'].includes(status) ? status : 'unresolved';
}
export const activationLabel = account => ({ due: 'Activation fee due', paid: 'Activation fee already paid', waived: 'Activation fee waived', unresolved: 'Activation status unresolved — estimate includes the fee' }[activationState(account)]);

export function estimateCommercialPrice(price, addon, cycle, quantity, account) {
  if (!['monthly', 'annual'].includes(cycle)) throw new Error('Choose Monthly or Annual.');
  if (quantity === '' || !Number.isInteger(Number(quantity)) || Number(quantity) < 0) throw new Error('Add-on quantity must be a non-negative whole number.');
  const count = Number(quantity);
  if (price?.currency_code !== 'INR') throw new Error('Pricing is unavailable in the supported currency.');
  const baseCapacity = Number(price.included_product_limit);
  if (!Number.isInteger(baseCapacity) || baseCapacity < 0) throw new Error('Invalid included capacity.');
  if (count && (!addon || addon.code !== 'product_slots_100' || addon.product_slots !== 100 || addon.currency_code !== 'INR')) throw new Error('The +100 product slots add-on is unavailable.');
  const capacity = baseCapacity + count * (addon?.product_slots || 0);
  if (!Number.isSafeInteger(capacity) || capacity > 2147483647) throw new Error('This quantity exceeds the supported product capacity.');
  const base = toPaise(price[`${cycle}_price`]);
  const addonUnit = count ? toPaise(addon[`${cycle}_price`]) : 0;
  const addonSubtotal = count * addonUnit;
  const recurring = base + addonSubtotal;
  const activation = ['paid', 'waived'].includes(activationState(account)) ? 0 : toPaise(price.activation_fee);
  const firstPayment = recurring + activation;
  if (!Number.isSafeInteger(firstPayment) || firstPayment > 999999999999) throw new Error('This selection exceeds the supported payment amount.');
  const savings = 12 * (toPaise(price.monthly_price) + (count ? count * toPaise(addon.monthly_price) : 0))
    - (toPaise(price.annual_price) + (count ? count * toPaise(addon.annual_price) : 0));
  return { base: base / 100, addonUnit: addonUnit / 100, addonSubtotal: addonSubtotal / 100,
    recurring: recurring / 100, activation: activation / 100, firstPayment: firstPayment / 100,
    annualSavings: Math.max(0, savings / 100), capacity, quantity: count, cycle };
}

export function saleableOffers(plans, prices, country) {
  return plans.filter(plan => plan.is_active && isPlanAvailableForBusiness(plan, country)).flatMap(plan => {
    const current = prices.filter(price => price.plan_id === plan.id && price.is_active);
    if (current.length !== 1) return []; // Inconsistent catalogs are never offered.
    return [{ plan, price: current[0] }];
  }).sort((a, b) => (Object.keys(LOCKED_OFFERS).indexOf(tierKey(a.plan)) + 1 || 99)
    - (Object.keys(LOCKED_OFFERS).indexOf(tierKey(b.plan)) + 1 || 99));
}

export function accessMessage(sources = []) {
  if (sources.includes('pos_membership')) return 'Digital Shop access is included through your POS plan. A standalone plan is optional.';
  if (sources.includes('legacy_profile_floor')) return 'You have legacy Digital Shop access. A standalone plan is optional.';
  if (sources.includes('standalone_digital_shop')) return 'Your standalone Digital Shop subscription provides access.';
  return 'Compare standalone Digital Shop plans. POS features are purchased separately.';
}

export function historicalSubscriptionDetails(subscription) {
  if (!subscription?.commercial_price_id) return null;
  const price = subscription.commercial_price;
  if (!price || price.id !== subscription.commercial_price_id || price.plan_id !== subscription.plan_id) throw new Error('Historical subscription pricing is unavailable.');
  const addon = subscription.addon_price;
  if (subscription.addon_quantity > 0 && addon?.id !== subscription.addon_price_id) throw new Error('Historical add-on pricing is unavailable.');
  return estimateCommercialPrice(price, addon, subscription.billing_cycle, subscription.addon_quantity, { activation_fee_status: 'paid' });
}

const checked = result => { if (result.error) throw result.error; return result.data; };
export async function loadCommercialCatalog(client, admin = false) {
  const tables = ['digital_shop_plans', 'digital_shop_commercial_prices', 'digital_shop_addon_prices'];
  const result = await Promise.all(tables.map(table => {
    let query = client.from(table).select('*');
    if (!admin) query = query.eq('is_active', true);
    return query;
  }));
  const [plans, prices, addons] = result.map(checked);
  return { plans: plans || [], prices: prices || [], addons: addons || [] };
}
export async function loadCommercialContext(client, businessId) {
  const [context, purchase] = await Promise.all([
    client.rpc('get_digital_shop_commercial_context', { p_business_id: businessId }),
    client.from('digital_shop_purchase_orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const data = checked(context);
  if (!data) throw new Error('Commercial details are available to the business owner or an administrator.');
  return { ...data, purchase: checked(purchase) };
}
export async function createPriceVersion(client, { planId, expectedVersion, terms, addon = false }) {
  toPaise(terms.monthly_price); toPaise(terms.annual_price);
  const args = { p_expected_version: expectedVersion, p_monthly_price: Number(terms.monthly_price), p_annual_price: Number(terms.annual_price) };
  if (addon) {
    if (args.p_monthly_price !== 79 || args.p_annual_price !== 790) throw new Error('The +100 slots offer is ₹79/month or ₹790/year.');
  } else {
    toPaise(terms.activation_fee);
    if (terms.included_product_limit === '' || terms.included_product_limit == null || !Number.isInteger(Number(terms.included_product_limit)) || Number(terms.included_product_limit) < 0 || Number(terms.included_product_limit) > 2147483647) throw new Error('Enter a valid included product limit.');
    Object.assign(args, { p_plan_id: planId, p_activation_fee: Number(terms.activation_fee), p_included_product_limit: Number(terms.included_product_limit) });
    for (const key of Object.keys(FEATURE_LABELS)) args[`p_${key}`] = Boolean(terms[key]);
    if (args.p_cod_orders_enabled && !args.p_cart_enabled) throw new Error('Cash on delivery requires the cart.');
  }
  return checked(await client.rpc(addon ? 'create_new_digital_shop_addon_price_version' : 'create_new_digital_shop_commercial_price_version', args));
}
