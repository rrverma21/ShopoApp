import React from 'react';
import { format, isToday, isValid } from 'date-fns';
import { ArrowRight, Receipt } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

const getTransactionLabel = sale => {
  if (sale.invoice_number) return `Invoice ${sale.invoice_number}`;
  if (sale.bill_number) return `Bill ${sale.bill_number}`;
  return `Transaction ${String(sale.id).slice(0, 8).toUpperCase()}`;
};

const formatSaleTimestamp = timestamp => {
  const saleDate = new Date(timestamp);
  if (!isValid(saleDate)) return 'Date unavailable';
  return isToday(saleDate)
    ? `Today, ${format(saleDate, 'h:mm a')}`
    : format(saleDate, 'dd MMM yyyy, h:mm a');
};

const RecentSales = ({ sales = [], loading, onViewAll, onNewBill }) => (
  <section className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]" aria-labelledby="recent-sales-title">
    <div className="flex min-h-[72px] items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 id="recent-sales-title" className="text-base font-bold text-slate-900">Recent Sales</h2>
        <p className="mt-0.5 text-xs text-slate-500">Latest POS transactions in this period</p>
      </div>
      <button type="button" onClick={onViewAll} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
        View all
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div className="px-5 py-2">
      {loading ? (
        <div className="divide-y divide-slate-100" aria-label="Loading recent sales">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-3 py-3.5">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-slate-100" />
                <div className="h-2.5 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-4 w-16 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : sales.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {sales.map(sale => (
            <li key={sale.id} className="flex items-center gap-3 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800" title={getTransactionLabel(sale)}>{getTransactionLabel(sale)}</p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <time dateTime={sale.created_at} className="text-[11px] font-medium text-slate-500">{formatSaleTimestamp(sale.created_at)}</time>
                  {sale.payment_method && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{sale.payment_method}</span>
                  )}
                </div>
              </div>
              <p className="whitespace-nowrap text-sm font-black tabular-nums text-slate-900 sm:text-base">{formatCurrency(Number(sale.total_amount) || 0)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true"><Receipt className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-bold text-slate-800">No sales found for this period.</p>
          <button type="button" onClick={onNewBill} className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">New Bill</button>
        </div>
      )}
    </div>
  </section>
);

export default RecentSales;
