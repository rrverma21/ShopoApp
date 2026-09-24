import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, ShoppingBag } from 'lucide-react';
import DigitalShopGuard from '@/components/DigitalShopGuard';
import { DashboardCard, OrderStatusBadge, displayDate } from '@/components/digital-shop/DigitalShopDashboardCards';
import { ORDER_STATUSES } from '@/components/digital-shop/dashboardMetrics';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { loadSellerOrdersPage } from '@/lib/digitalShopSeller';
import { formatPrice } from '@/lib/utils';
import { ShopoContentCard, ShopoPageContainer, ShopoPageShell } from '@/components/ui/shopo-page';

function OrderDetails({ order, onStatusChange, updating }) {
  const address = order.shipping_address;
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  return <details className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
    <summary className="cursor-pointer rounded py-1 text-sm font-medium text-blue-700 focus-visible:outline focus-visible:outline-2 dark:text-blue-300">View order details<span className="sr-only"> for order {order.id}</span></summary>
    <div className="mt-4 space-y-4 text-sm">
      <p className="break-all"><span className="text-slate-500 dark:text-slate-400">Order ID: </span>{order.id}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><h3 className="font-semibold">Customer & delivery</h3><p className="mt-1 break-words">{order.customer_phone || 'Phone not provided'}</p><p className="mt-1 break-words">{[address?.address, address?.city, address?.pincode].filter(Boolean).join(', ') || 'Address not provided'}</p></div>
        <div><h3 className="font-semibold">Payment</h3><p className="mt-1">Method: {order.payment_method || 'Not specified'}</p><p>Status: {order.payment_status || 'Not specified'}</p></div>
      </div>
      <div><h3 className="font-semibold">Items</h3>{items.length ? <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">{items.map((item, index) => <li key={index} className="flex flex-wrap items-start justify-between gap-2 py-2"><span className="min-w-0 break-words">{item.name || item.product_name || 'Item'}{item.variant_name && ` · ${item.variant_name}`}</span><span className="shrink-0">{item.quantity ?? '—'} × {formatPrice(item.unit_price ?? item.price)}</span></li>)}</ul> : <p className="mt-1 text-slate-500 dark:text-slate-400">Item details are unavailable.</p>}</div>
      {order.gift_wrapping && <p>Gift wrapping: {formatPrice(order.gift_wrapping_cost)}</p>}
      <p className="font-semibold">Order total: {formatPrice(order.total_amount)}</p>
      {({ Pending: ['Processing', 'Cancelled'], Processing: ['Shipped', 'Cancelled'], Shipped: ['Delivered'] }[order.status] || []).length > 0 && <div className="flex flex-wrap gap-2 border-t pt-3"><span className="w-full text-sm font-medium">Update order status</span>{({ Pending: ['Processing', 'Cancelled'], Processing: ['Shipped', 'Cancelled'], Shipped: ['Delivered'] }[order.status] || []).map(next => <Button key={next} size="sm" variant={next === 'Cancelled' ? 'destructive' : 'default'} disabled={updating === order.id} onClick={() => onStatusChange(order.id, next)}>{updating === order.id ? 'Updating…' : `Mark ${next}`}</Button>)}</div>}
    </div>
  </details>;
}

function DigitalShopOrdersContent({ entitlement }) {
  const businessId = entitlement.businessId;
  const [status, setStatus] = useState('All');
  const [offsets, setOffsets] = useState([0]);
  const offset = offsets[offsets.length - 1];
  const [revision, setRevision] = useState(0);
  const [liveError, setLiveError] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [state, setState] = useState({ loading: true, error: false, orders: [], total: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: false, orders: [], total: null });
    loadSellerOrdersPage(supabase, businessId, { offset, status, signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) setState({ ...result, loading: false, error: false });
      }).catch(() => {
        if (!controller.signal.aborted) setState({ loading: false, error: true, orders: [], total: null });
      });
    return () => controller.abort();
  }, [businessId, offset, status, revision]);

  useEffect(() => {
    let timer;
    let active = true;
    const channel = supabase.channel(`digital-shop-seller-orders-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_shop_orders', filter: `retailer_id=eq.${businessId}` }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => setRevision(value => value + 1), 250);
      }).subscribe(connection => {
        if (active) setLiveError(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(connection));
      });
    return () => {
      active = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const { orders, loading, error, total } = state;
  const nextOffset = offset + orders.length;
  const hasNext = orders.length > 0 && (total == null ? orders.length === 20 : nextOffset < total);
  const updateStatus = async (orderId, nextStatus) => { if (updating) return; setUpdating(orderId); const { error: updateError } = await supabase.rpc('update_digital_shop_order_status', { p_order_id: orderId, p_status: nextStatus }); setUpdating(null); if (updateError) { setState(current => ({ ...current, error: true })); return; } setRevision(value => value + 1); };

  const itemCount = order => Array.isArray(order.order_items) ? order.order_items.length : 0;
  return <ShopoPageShell>
    <ShopoPageContainer width="standard" className="space-y-4 py-4 sm:space-y-5 sm:py-6">
      <header className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">Digital Shop</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Orders</h1><p className="mt-1 text-sm text-slate-500">Manage and fulfil customer orders.</p><Button asChild variant="link" size="sm" className="mt-1 h-auto px-0 text-slate-500"><Link to="/digital-shop/dashboard"><ArrowLeft aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />Back to Dashboard</Link></Button></div><Button variant="outline" size="sm" className="mt-1 h-10 shrink-0" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw aria-hidden="true" className="mr-1.5 h-4 w-4" />Refresh</Button></header>
      <ShopoContentCard className="border-slate-200 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order summary</p><p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{total ?? '—'} <span className="text-sm font-medium text-slate-500">orders</span></p></div><OrderStatusBadge status={status === 'All' ? 'All' : status} /></div>
        <div className="mt-2.5 -mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"><div className="flex w-max gap-2">{['All', ...ORDER_STATUSES].map(value => <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} className="h-9 rounded-full px-3" onClick={() => { setStatus(value); setOffsets([0]); }}>{value}</Button>)}</div></div>
      </ShopoContentCard>
      {liveError && <p role="status" className="rounded-lg border border-amber-300 p-3 text-sm text-amber-800 dark:border-amber-800 dark:text-amber-300">Live updates are temporarily unavailable. Use Refresh Orders for the latest data.</p>}
      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-12"><Loader2 aria-hidden="true" className="h-6 w-6 animate-spin" />Loading orders...</div>
        : error ? <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><p>Unable to load your Digital Shop orders. Please try again.</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Retry</Button></div>
        : !orders.length ? <DashboardCard compact homepageStyle title={offset > 0 ? 'No orders on this page' : status === 'All' ? 'No orders found' : `No ${status.toLowerCase()} orders`} icon={ShoppingBag}><p className="text-sm text-slate-500 dark:text-slate-400">{offset > 0 ? 'Orders may have changed. Return to the previous page.' : status === 'All' ? 'Share your shop link from the dashboard to start receiving orders.' : 'Choose another status to browse your order history.'}</p></DashboardCard>
        : <div className="space-y-2.5 sm:space-y-3">{orders.map(order => <article key={order.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-slate-500">#{order.id.slice(0, 8)}</p><h2 className="mt-1 truncate font-semibold text-slate-900 dark:text-white">{order.shipping_address?.name || order.customer?.business_name || order.customer?.contact_person || 'Customer'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{displayDate(order.created_at, true)} · {itemCount(order)} {itemCount(order) === 1 ? 'item' : 'items'}</p></div><div className="shrink-0 text-right"><p className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatPrice(order.total_amount)}</p><div className="mt-1"><OrderStatusBadge status={order.status} /></div></div></div>
          <OrderDetails order={order} onStatusChange={updateStatus} updating={updating} />
        </article>)}</div>}
      {!loading && !error && orders.length > 0 && (offsets.length > 1 || hasNext) && <nav aria-label="Order pages" className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500 dark:text-slate-400">{offset + 1}–{nextOffset}{total == null ? '' : ` of ${total}`} orders</p><div className="flex gap-2"><Button variant="outline" disabled={offsets.length === 1} onClick={() => setOffsets(values => values.slice(0, -1))}>Previous</Button><Button variant="outline" disabled={!hasNext} onClick={() => setOffsets(values => [...values, nextOffset])}>Next</Button></div></nav>}
    </ShopoPageContainer>
  </ShopoPageShell>;
}

export default function DigitalShopOrdersPage() {
  return <DigitalShopGuard>{entitlement => <DigitalShopOrdersContent key={entitlement.businessId} entitlement={entitlement} />}</DigitalShopGuard>;
}
