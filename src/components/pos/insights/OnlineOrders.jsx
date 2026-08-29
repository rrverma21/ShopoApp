import React from 'react';
import { format, isToday, isValid } from 'date-fns';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const statusStyles = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Processing: 'border-blue-200 bg-blue-50 text-blue-700',
  Ready: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-red-200 bg-red-50 text-red-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
};

const formatOrderTimestamp = timestamp => {
  const orderDate = new Date(timestamp);
  if (!isValid(orderDate)) return 'Date unavailable';
  return isToday(orderDate)
    ? `Today, ${format(orderDate, 'h:mm a')}`
    : format(orderDate, 'dd MMM yyyy, h:mm a');
};

const OnlineOrders = ({ orders = [], loading, hasError, onViewAll }) => (
  <section className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]" aria-labelledby="online-orders-title">
    <div className="flex min-h-[72px] items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 id="online-orders-title" className="text-base font-bold text-slate-900">Online Orders</h2>
        <p className="mt-0.5 text-xs text-slate-500">Latest Digital Shop orders</p>
      </div>
      <button type="button" onClick={onViewAll} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
        View all
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div className="px-5 py-2">
      {loading ? (
        <div className="divide-y divide-slate-100" aria-label="Loading online orders">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-3 py-3.5">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-2.5 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-4 w-16 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : hasError ? (
        <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true"><ShoppingBag className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-bold text-slate-800">Online orders are temporarily unavailable.</p>
          <button type="button" onClick={onViewAll} className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">View Orders</button>
        </div>
      ) : orders.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {orders.map(order => (
            <li key={order.id} className="flex items-center gap-3 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600" aria-hidden="true">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-800">Order #{String(order.id).slice(0, 8).toUpperCase()}</p>
                  {order.status && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyles[order.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{order.status}</span>
                  )}
                </div>
                <time dateTime={order.created_at} className="mt-1 block text-[11px] font-medium text-slate-500">{formatOrderTimestamp(order.created_at)}</time>
              </div>
              <p className="whitespace-nowrap text-sm font-black tabular-nums text-slate-900 sm:text-base">{formatPrice(order.total_amount)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true"><ShoppingBag className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-bold text-slate-800">No online orders found for this period.</p>
          <button type="button" onClick={onViewAll} className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">View Orders</button>
        </div>
      )}
    </div>
  </section>
);

export default OnlineOrders;
