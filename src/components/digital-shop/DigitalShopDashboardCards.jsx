import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

const homepageCardStyle = 'rounded-2xl border-slate-100 bg-white shadow-md transition-all duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800';

export function DashboardCard({ title, icon: Icon, description, children, className = '', homepageStyle = false, compact = false }) {
  return <Card className={`min-w-0 bg-white dark:bg-slate-900 ${homepageStyle ? homepageCardStyle : ''} ${className}`}>
    <CardHeader className={compact ? 'space-y-1 p-4 pb-2' : undefined}><CardTitle className="flex items-center gap-2 text-base"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />{title}</CardTitle>{description && <CardDescription className="text-xs">{description}</CardDescription>}</CardHeader>
    <CardContent className={compact ? 'p-4 pt-2' : undefined}>{children}</CardContent>
  </Card>;
}

export function DigitalShopStatCard({ title, value, description, icon: Icon, loading, homepageStyle = false, compact = false }) {
  return <Card className={`min-w-0 bg-white dark:bg-slate-900 ${homepageStyle ? homepageCardStyle : ''} ${compact ? 'w-[152px] shrink-0 snap-start sm:w-auto' : ''}`}><CardContent className={compact ? 'space-y-1.5 p-3.5' : 'space-y-3 p-5'}>
    <div className="flex items-center justify-between gap-2"><h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</h2><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" /></div>
    <div className={compact ? 'break-words text-xl font-bold tabular-nums' : 'break-words text-2xl font-bold tabular-nums'}>{loading ? <Loader2 aria-label="Loading" className="h-6 w-6 animate-spin" /> : value}</div>
    <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
  </CardContent></Card>;
}

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  Delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
export const OrderStatusBadge = ({ status }) => <Badge variant="outline" className={statusColors[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}>{status || 'Unknown'}</Badge>;

export function displayDate(value, time = false) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date) : 'Not specified';
}

export function DigitalShopRecentOrders({ orders, loading, error, ordersPath, homepageStyle = false, compact = false }) {
  return <DashboardCard title="Recent Orders" icon={ShoppingBag} description="Latest customer orders and their current status." homepageStyle={homepageStyle} compact={compact}>
    {loading && !orders.length ? <div role="status" className="flex items-center gap-2 py-5 text-sm"><Loader2 className="h-5 w-5 animate-spin" />Loading orders...</div>
      : error ? <p className="py-6 text-sm text-slate-500 dark:text-slate-400">Order data is unavailable. Use Retry above to load it again.</p>
      : !orders.length ? <div className="space-y-2 py-5 text-center"><ShoppingBag aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" /><p className="text-sm font-semibold">No Digital Shop orders yet.</p><p className="text-xs text-slate-500 dark:text-slate-400">Share your shop link to start receiving orders.</p></div>
      : <ul className="divide-y divide-slate-200 dark:divide-slate-800">{orders.map(order => <li key={order.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="break-words font-medium">{order.shipping_address?.name || order.customer?.business_name || order.customer?.contact_person || 'Customer'}</p><p title={order.id} className="mt-1 text-xs text-slate-500 dark:text-slate-400">#{order.id.slice(0, 8)} · {displayDate(order.created_at, true)}</p></div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end"><span className="font-semibold tabular-nums">{formatPrice(order.total_amount)}</span><OrderStatusBadge status={order.status} /></div>
      </li>)}</ul>}
    <div className="mt-4 border-t pt-4 dark:border-slate-800"><Button asChild variant="outline"><Link to={ordersPath}>View All Orders</Link></Button></div>
  </DashboardCard>;
}
