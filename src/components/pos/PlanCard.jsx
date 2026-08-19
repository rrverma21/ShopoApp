import React from 'react';
import { Check, Crown, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PlanCard = ({ plan, isCurrent, onSelect }) => {
  const isPopular = plan.is_featured;

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card 
      className={cn(
        "relative flex flex-col h-full transition-all duration-300 border rounded-xl overflow-visible",
        isCurrent 
          ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20" 
          : isPopular 
            ? "border-purple-500 bg-white shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/20 scale-[1.02] md:scale-105 z-10" 
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xl hover:-translate-y-1"
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-blue-600/20 flex items-center gap-1 z-20 tracking-wide uppercase">
          <Check className="w-3 h-3 stroke-[3px]" /> Current Plan
        </div>
      )}
      
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-purple-600/30 flex items-center gap-1 z-20 tracking-wide uppercase">
          <Crown className="w-3 h-3 fill-current" /> Most Popular
        </div>
      )}

      <CardHeader className={cn("text-center pb-2 pt-8 rounded-t-xl", isPopular && "bg-slate-50/50")}>
        <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {formatPrice(plan.price)}
          </span>
          <span className="text-sm font-medium text-slate-500">/{plan.duration_days} days</span>
        </div>
        {plan.description && (
          <CardDescription className="mt-3 text-sm text-slate-500 line-clamp-2 px-2 min-h-[40px]">
            {plan.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-grow pt-6">
        <div className="space-y-4">
            {/* Limit badges */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Products</div>
                    <div className="font-semibold text-slate-700 text-sm">{plan.max_products || '∞'}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Staff</div>
                    <div className="font-semibold text-slate-700 text-sm">{plan.max_employees || 0}</div>
                </div>
            </div>

            <div className="space-y-3">
                {plan.features && plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <div className={cn("mt-0.5 rounded-full p-1 shrink-0", isPopular ? "bg-purple-100 text-purple-600" : "bg-green-100 text-green-600")}>
                        <Check className="h-2.5 w-2.5 stroke-[3px]" />
                    </div>
                    <span className="leading-snug">{feature}</span>
                </div>
                ))}
                
                {/* Implicit feature: Pincodes */}
                <div className="flex items-start gap-3 text-sm text-slate-600">
                    <div className={cn("mt-0.5 rounded-full p-1 shrink-0", isPopular ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600")}>
                        <Zap className="h-2.5 w-2.5 fill-current" />
                    </div>
                    <span className="leading-snug">
                        Serviceable Pincodes: {plan.max_pincodes || 1}
                    </span>
                </div>
            </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 pb-6 px-6">
        <Button 
          onClick={() => !isCurrent && onSelect(plan)}
          variant={isCurrent ? "outline" : (isPopular ? "default" : "secondary")}
          disabled={isCurrent}
          className={cn(
            "w-full h-11 text-sm font-semibold shadow-sm transition-all rounded-lg",
            isCurrent 
                ? "bg-transparent text-blue-600 border-blue-200 hover:bg-blue-50 cursor-default opacity-80" 
                : isPopular
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200 hover:shadow-lg hover:scale-[1.02]"
                    : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:scale-[1.02]"
          )}
        >
          {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;