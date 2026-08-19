import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils'; // Import formatCurrency
import { Skeleton } from '@/components/ui/skeleton';

const MetricCard = ({ title, icon: Icon, metrics, colorClass, loading, onClick, linkText }) => {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full",
        colorClass
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-6 h-6 text-slate-800" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>

        {loading ? (
          <div className="space-y-2 mt-auto">
            <Skeleton className="h-4 w-24 bg-white/30" />
            <Skeleton className="h-6 w-32 bg-white/30" />
          </div>
        ) : (
          <div className="space-y-3 mt-auto">
            {metrics.map((metric, index) => (
              <div key={index} className="flex justify-end items-center gap-2 text-slate-700">
                <span className="text-sm font-medium opacity-80">{metric.label}:</span>
                {/* Apply formatCurrency only to specific metric values, assuming 'value' is already pre-formatted if not currency */}
                {metric.isCurrency ? (
                    <span className="text-lg font-bold">{formatCurrency(metric.value || 0)}</span>
                ) : (
                    <span className="text-lg font-bold">{metric.value}</span>
                )}
              </div>
            ))}
            {linkText && (
               <div className="flex items-center justify-center mt-4 pt-2 border-t border-slate-200/20">
                  <span className="font-semibold text-slate-800 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
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