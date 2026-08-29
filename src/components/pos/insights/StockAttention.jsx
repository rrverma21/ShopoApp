import React from 'react';
import { AlertTriangle, ArrowRight, PackageX, RefreshCw } from 'lucide-react';

const StockAttention = ({ attention, loading, hasError, onViewProducts, onSmartReorder }) => {
  const { lowStockCount = 0, outOfStockCount = 0, products = [] } = attention || {};

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]" aria-labelledby="stock-attention-title">
      <div className="flex min-h-[72px] items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 id="stock-attention-title" className="text-base font-bold text-slate-900">Stock Attention</h2>
          <p className="mt-0.5 text-xs text-slate-500">Current inventory exceptions</p>
        </div>
        <button type="button" onClick={onViewProducts} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
          View products
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-5 py-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Low Stock</p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{loading ? '—' : lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Out of Stock</p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{loading ? '—' : outOfStockCount}</p>
        </div>
      </div>

      <div className="px-5 py-2">
        {loading ? (
          <div className="divide-y divide-slate-100" aria-label="Loading stock attention">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 py-3.5">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-32 rounded bg-slate-100" /><div className="h-2.5 w-20 rounded bg-slate-100" /></div>
                <div className="h-5 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true"><AlertTriangle className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-bold text-slate-800">Stock attention is temporarily unavailable.</p>
            <button type="button" onClick={onViewProducts} className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">View Products</button>
          </div>
        ) : products.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {products.map(product => {
              const isOutOfStock = Number(product.stock_level || 0) <= 0;
              return (
                <li key={product.id} className="flex items-center gap-3 py-3.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isOutOfStock ? 'border-red-100 bg-red-50 text-red-600' : 'border-amber-100 bg-amber-50 text-amber-600'}`} aria-hidden="true">
                    {isOutOfStock ? <PackageX className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-800">{product.name}</p>
                    <p className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-500">{Number(product.stock_level || 0)} in stock</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${isOutOfStock ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{isOutOfStock ? 'Out of Stock' : 'Low Stock'}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600" aria-hidden="true"><AlertTriangle className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-bold text-slate-800">Stock levels look healthy.</p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <button type="button" onClick={onSmartReorder} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Smart Reorder
        </button>
      </div>
    </section>
  );
};

export default StockAttention;
