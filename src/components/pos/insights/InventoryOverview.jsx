import React from 'react';
import { AlertCircle, ArrowRight, Boxes, PackageCheck, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const InventoryOverview = ({ inventory, loading, onViewProducts, onOpenSmartReorder }) => {
  const totalProducts = inventory.totalProducts || 0;
  const inStockProducts = inventory.inStockProducts || 0;
  const outOfStockProducts = inventory.outOfStockProducts || 0;
  const inStockPercent = totalProducts > 0 ? (inStockProducts / totalProducts) * 100 : 0;
  const outOfStockPercent = totalProducts > 0 ? (outOfStockProducts / totalProducts) * 100 : 0;

  return (
    <section aria-labelledby="inventory-overview-title" className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="inventory-overview-title" className="text-lg font-bold text-slate-900">Inventory Overview</h2>
          <p className="mt-1 text-xs text-slate-500">View your current stock position and inventory value.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenSmartReorder} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Smart Reorder
          </button>
          <button type="button" onClick={onViewProducts} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            View Products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.4fr_.6fr]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inventory Value</p>
            <p className="mt-1 whitespace-nowrap text-[clamp(1.05rem,2.5vw,1.5rem)] font-bold tracking-tight tabular-nums text-slate-900">{loading ? '—' : formatCurrency(inventory.totalValue || 0)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600">
              <PackageCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Units in Stock</p>
            <p className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900">{loading ? '—' : inventory.totalVolume}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-600">
              <PackageCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Active Products</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{loading ? '—' : totalProducts}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Stock Position</h3>
              <p className="mt-1 text-xs text-slate-500">Based on current product quantities.</p>
            </div>
            <AlertCircle className={`h-5 w-5 shrink-0 ${outOfStockProducts > 0 ? 'text-red-500' : 'text-emerald-500'}`} aria-hidden="true" />
          </div>

          {!loading && totalProducts > 0 ? (
            <>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${inStockProducts} in stock and ${outOfStockProducts} out of stock`}>
                <span className="bg-emerald-500" style={{ width: `${inStockPercent}%` }} />
                <span className="bg-red-500" style={{ width: `${outOfStockPercent}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />In Stock</div>
                  <p className="mt-1 text-xl font-bold text-slate-900">{inStockProducts}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-red-500" />Out of Stock</div>
                  <p className="mt-1 text-xl font-bold text-slate-900">{outOfStockProducts}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm font-medium text-slate-500">
              {loading ? 'Loading stock position…' : 'No active products found.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InventoryOverview;
