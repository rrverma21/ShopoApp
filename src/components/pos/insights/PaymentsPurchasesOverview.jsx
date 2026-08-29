import React from 'react';
import { ArrowRight, Clock3, CreditCard, ShoppingCart, WalletCards } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PaymentsPurchasesOverview = ({ payment, purchase, loading, pendingLoading, pendingError, onViewPending, onViewCredit, onViewPurchases }) => (
  <section aria-labelledby="payments-purchases-title" className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 id="payments-purchases-title" className="text-lg font-bold text-slate-900">Payments &amp; Purchases</h2>
        <p className="mt-1 text-xs text-slate-500">Track incoming payments, pending balances and purchase bills.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onViewCredit} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
          <WalletCards className="h-4 w-4" aria-hidden="true" />
          View Credit
        </button>
        <button type="button" onClick={onViewPurchases} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
          Purchase Bills
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
      <article className="flex min-h-[124px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-600">Payments Received</h3>
            <p className="mt-1 text-xs text-slate-400">Within the selected period</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-5 whitespace-nowrap text-[clamp(1.05rem,2.5vw,1.5rem)] font-bold tracking-tight tabular-nums text-slate-900">{loading ? '—' : formatCurrency(payment.total || 0)}</p>
      </article>

      <article className="flex min-h-[124px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-600">Pending Payments</h3>
            <p className="mt-1 text-xs text-slate-400">Current outstanding credit</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <p className="whitespace-nowrap text-[clamp(1.05rem,2.5vw,1.5rem)] font-bold tracking-tight tabular-nums text-slate-900">{loading || pendingLoading || pendingError ? '—' : formatCurrency(payment.pending || 0)}</p>
          <button type="button" onClick={onViewPending} className="text-xs font-bold text-amber-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">View pending</button>
        </div>
      </article>

      <article className="flex min-h-[124px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:col-span-2 lg:col-span-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-600">Purchase Bill Total</h3>
            <p className="mt-1 text-xs text-slate-400">Within the selected period</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-5 whitespace-nowrap text-[clamp(1.05rem,2.5vw,1.5rem)] font-bold tracking-tight tabular-nums text-slate-900">{loading ? '—' : formatCurrency(purchase.total || 0)}</p>
      </article>
    </div>
  </section>
);

export default PaymentsPurchasesOverview;
