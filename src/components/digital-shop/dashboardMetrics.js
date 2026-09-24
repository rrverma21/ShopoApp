export const ORDER_STATUSES = ['Pending', 'Processing', 'Ready', 'Completed', 'Cancelled', 'Rejected'];

// Completed is the existing terminal success state, including orders moved to POS.
// This is completed order value, not a payment settlement or profit calculation.
export function summarizeOrders(orders) {
  const counts = Object.fromEntries(ORDER_STATUSES.map(status => [status, 0]));
  let revenue = 0;
  let unknown = 0;
  for (const order of orders) {
    if (Object.hasOwn(counts, order.status)) counts[order.status] += 1;
    else unknown += 1;
    if (order.status === 'Completed') {
      const amount = Number(order.total_amount);
      if (Number.isFinite(amount)) revenue += amount;
    }
  }
  return { total: orders.length, counts, revenue, unknown };
}

export async function loadOrderMetrics(client, businessId, signal) {
  const orders = [];
  let total;
  do {
    const { data, count, error } = await client.from('digital_shop_orders')
      .select('id, status, total_amount', { count: 'exact' })
      .eq('retailer_id', businessId).order('id')
      .range(orders.length, orders.length + 499).abortSignal(signal);
    if (error) throw error;
    total = count;
    if (!data?.length) {
      if (total > orders.length) throw new Error('Incomplete order summary');
      break;
    }
    orders.push(...data);
  } while (total == null || orders.length < total);
  return summarizeOrders(orders);
}
