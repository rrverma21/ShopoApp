import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const SalesChart = ({ data, loading }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="min-w-40 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="space-y-2">
          {payload.map(entry => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-5 text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="whitespace-nowrap font-bold tabular-nums text-slate-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLegend = ({ payload = [] }) => (
    <div className="mb-3 flex flex-wrap justify-end gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
      {payload.map(entry => (
        <div key={entry.value} className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );

  const totalSales = data?.reduce((acc, curr) => acc + (curr.Sales || 0), 0) || 0;
  const totalRevenue = data?.reduce((acc, curr) => acc + (curr.Profit || 0), 0) || 0;
  const hasData = data?.length > 0;

  return (
    <Card className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <CardHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Sales &amp; Revenue</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Track business performance across the selected period.</p>
            </div>
          </div>

          {!loading && hasData && (
            <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 sm:min-w-[280px]">
              <div className="pr-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Sales</p>
                <p className="mt-1 whitespace-nowrap text-[clamp(.9rem,1.5vw,1rem)] font-bold leading-tight tabular-nums text-slate-900">{formatCurrency(totalSales)}</p>
              </div>
              <div className="pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net Revenue</p>
                <p className="mt-1 whitespace-nowrap text-[clamp(.9rem,1.5vw,1rem)] font-bold leading-tight tabular-nums text-slate-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-xl bg-slate-100 sm:h-[260px] lg:h-[290px]" />
        ) : !hasData ? (
          <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 sm:h-[260px] lg:h-[290px]">
            <div className="text-center">
              <BarChart3 className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-600">No sales data for this period.</p>
            </div>
          </div>
        ) : (
          <div className="h-[220px] w-full sm:h-[260px] lg:h-[290px]" aria-label="Sales and net revenue chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={value => formatCurrency(value)} width={74} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#CBD5E1', strokeDasharray: '4 4' }} />
                <Legend content={renderLegend} verticalAlign="top" height={34} />
                <Area type="monotone" dataKey="Sales" name="Sales" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }} />
                <Area type="monotone" dataKey="Profit" name="Net Revenue" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;
