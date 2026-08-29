import React from 'react';
import { format, isValid } from 'date-fns';
import { ArrowRight, WalletCards } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const getInvoiceLabel = entry => {
  if (entry.invoice_number) return `Invoice ${entry.invoice_number}`;
  if (entry.bill_number) return `Bill ${entry.bill_number}`;
  return `Invoice #${String(entry.id).slice(0, 8).toUpperCase()}`;
};

const formatCreditDate = timestamp => {
  const date = new Date(timestamp);
  return isValid(date) ? format(date, 'dd MMM yyyy') : 'Date unavailable';
};

const PendingPayments = ({ data, loading, hasError, onViewCredit }) => {
  const { total = 0, customerCount = 0, entries = [] } = data || {};

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]" aria-labelledby="pending-payments-title">
      <div className="flex min-h-[72px] items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 id="pending-payments-title" className="text-base font-bold text-slate-900">Pending Payments</h2>
          <p className="mt-0.5 text-xs text-slate-500">Outstanding customer credit</p>
        </div>
        <button type="button" onClick={onViewCredit} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
          View Credit
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-5 py-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total Outstanding</p>
          <p className="mt-1 whitespace-nowrap text-lg font-black tabular-nums text-slate-900">{loading || hasError ? '—' : formatPrice(total)}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Customers</p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{loading || hasError ? '—' : customerCount}</p>
        </div>
      </div>

      <div className="px-5 py-2">
        {loading ? (
          <div className="divide-y divide-slate-100" aria-label="Loading pending payments">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 py-3.5">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-28 rounded bg-slate-100" /><div className="h-2.5 w-24 rounded bg-slate-100" /></div>
                <div className="h-4 w-16 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true"><WalletCards className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-bold text-slate-800">Pending payments are temporarily unavailable.</p>
            <button type="button" onClick={onViewCredit} className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">View Credit</button>
          </div>
        ) : entries.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {entries.map(entry => (
              <li key={entry.id} className="flex items-center gap-3 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600" aria-hidden="true"><WalletCards className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{entry.customer?.name || getInvoiceLabel(entry)}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{entry.customer?.name ? `${getInvoiceLabel(entry)} · ` : ''}{formatCreditDate(entry.created_at)}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-black tabular-nums text-red-600 sm:text-base">{formatPrice(entry.balance_due)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600" aria-hidden="true"><WalletCards className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-bold text-slate-800">No pending customer payments.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PendingPayments;
