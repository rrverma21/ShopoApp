export function getPublicShopUrl(businessId, origin) {
  if (typeof businessId !== 'string' || !businessId.trim()) return null;
  try {
    const base = new URL(origin);
    if (!['http:', 'https:'].includes(base.protocol)) return null;
    return new URL(`/shop/${encodeURIComponent(businessId)}`, base.origin).href;
  } catch {
    return null;
  }
}

export function getSellerOrdersPath() {
  return '/digital-shop/orders';
}

export async function loadSellerOrdersPage(client, businessId, { offset = 0, status = 'All', signal } = {}) {
  if (!businessId) throw new Error('Business unavailable');
  let query = client.from('digital_shop_orders')
    .select('id, created_at, total_amount, status, shipping_address, customer_phone, order_items, payment_method, payment_status, gift_wrapping, gift_wrapping_cost, customer:profiles!digital_shop_orders_customer_id_fkey(business_name, contact_person)', { count: 'exact' })
    .eq('retailer_id', businessId);
  if (status !== 'All') query = query.eq('status', status);
  const { data, count, error } = await query.order('created_at', { ascending: false })
    .order('id', { ascending: false }).range(offset, offset + 19).abortSignal(signal);
  if (error) throw error;
  return { orders: data || [], total: count };
}
