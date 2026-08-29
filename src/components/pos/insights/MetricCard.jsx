import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const MetricCard = ({ title, icon: Icon, metrics, accentClass, metricGridClass, loading, onClick, linkText }) => {
  const handleKeyDown = event => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card 
      className={cn(
        "group relative h-full min-h-[124px] overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="pt-1 text-sm font-semibold text-slate-600">{title}</h3>
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", accentClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-7 w-28 bg-slate-100" />
            <Skeleton className="h-3.5 w-20 bg-slate-100" />
          </div>
        ) : (
          <div className={cn("mt-4 grid gap-3", metrics.length > 1 && "divide-x divide-slate-100", metrics.length > 1 && (metricGridClass || "grid-cols-2"))}>
            {metrics.map((metric, index) => (
              <div key={index} className={cn("min-w-0", index > 0 && metrics.length > 1 && "pl-3")}>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{metric.label}</span>
                {metric.isCurrency ? (
                  <span className="mt-1 block whitespace-nowrap text-[clamp(1rem,1.6vw,1.65rem)] font-bold leading-tight tracking-tight tabular-nums text-slate-900">{formatCurrency(metric.value || 0)}</span>
                ) : (
                  <span className="mt-1 block whitespace-nowrap text-[clamp(1rem,1.6vw,1.65rem)] font-bold leading-tight tracking-tight tabular-nums text-slate-900">{metric.value}</span>
                )}
              </div>
            ))}
            {linkText && (
               <div className="col-span-full mt-1 flex items-center justify-center border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-2 font-semibold text-slate-700 transition-transform group-hover:translate-x-1">
                    {linkText} <Icon className="w-4 h-4 ml-1" />
                  </span>
               </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
