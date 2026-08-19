import React, { useState } from 'react';
import { Check, Crown, Zap, Shield, ChevronDown, ChevronUp, Star, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice, parseFeatures } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MembershipPlanCard = ({ plan, currentPlanId, onSelect, billingCycle = 'monthly' }) => {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const isCurrent = currentPlanId === plan.id;
  const isPopular = plan.is_featured;
  
  const features = parseFeatures(plan.features);
  const displayFeatures = showAllFeatures ? features : features.slice(0, 5);
  const hasHiddenFeatures = features.length > 5;

  const monthlyPrice = plan.price_monthly || plan.price || 0;
  const yearlyPrice = (plan.price_yearly && plan.price_yearly > 0) 
      ? plan.price_yearly 
      : (monthlyPrice * 10); // Default fallback: 10 months for yearly

  const displayPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;
  const durationLabel = billingCycle === 'yearly' ? '/year' : '/month';

  return (
    <Card 
      className={cn(
        "relative flex flex-col h-full transition-all duration-300 rounded-2xl overflow-visible group",
        isCurrent 
          ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-lg ring-1 ring-emerald-500/20" 
          : isPopular 
            ? "border-purple-500 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-purple-500/20 scale-[1.01] z-10" 
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:-translate-y-1"
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20 tracking-wide uppercase whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 stroke-[3px]" /> Current Plan
        </div>
      )}
      
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-20 tracking-wide uppercase whitespace-nowrap">
          <Crown className="w-3 h-3 fill-current" /> Recommended
        </div>
      )}

      <CardHeader className={cn("text-center pb-4 pt-8 rounded-t-2xl", isPopular && "bg-slate-50/50 dark:bg-slate-800/50")}>
        <div className="flex justify-center mb-2">
            {isPopular ? <Star className="w-8 h-8 text-purple-500 fill-purple-100 dark:fill-purple-900/30" /> : <Shield className="w-8 h-8 text-slate-400" />}
        </div>
        <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{plan.name}</CardTitle>
        <div className="mt-3 flex items-baseline justify-center gap-1">
          <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatPrice(displayPrice)}
          </span>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{durationLabel}</span>
        </div>
        <div className="min-h-[40px] flex items-center justify-center">
            {plan.description && (
            <CardDescription className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 px-2 leading-relaxed">
                {plan.description}
            </CardDescription>
            )}
        </div>
      </CardHeader>

      <div className="px-6 py-2">
        <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />
      </div>

      <CardContent className="flex-grow pt-4 px-6 space-y-6">
        {/* Core Limits Grid */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-center transition-colors hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Products</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {plan.max_products >= 1000000 ? 'Unlimited' : plan.max_products || 'Limited'}
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-center transition-colors hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Staff Access</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {plan.max_employees || 0} Users
                </div>
            </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3" role="list" aria-label="Plan features">
            <AnimatePresence initial={false}>
                {displayFeatures.map((feature, i) => (
                <motion.div 
                    key={`${plan.id}-feat-${i}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 group/feature"
                    role="listitem"
                >
                    <div className={cn(
                        "mt-0.5 rounded-full p-1 shrink-0 transition-colors", 
                        isPopular 
                            ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover/feature:bg-purple-200 dark:group-hover/feature:bg-purple-900/50" 
                            : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 group-hover/feature:bg-green-200 dark:group-hover/feature:bg-green-900/50"
                    )}>
                        <Check className="h-3 w-3 stroke-[3px]" aria-hidden="true" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-tight break-words">
                        {feature}
                    </span>
                </motion.div>
                ))}
            </AnimatePresence>
            
            {/* Always visible core features */}
            <div className="flex items-start gap-3 group/feature">
                <div className={cn("mt-0.5 rounded-full p-1 shrink-0", isPopular ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400")}>
                    <Zap className="h-3 w-3 fill-current" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-tight">
                    Service Areas: {plan.max_pincodes || 1}
                </span>
            </div>
        </div>

        {hasHiddenFeatures && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="w-full text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 h-8"
                aria-expanded={showAllFeatures}
                aria-controls={`features-list-${plan.id}`}
            >
                {showAllFeatures ? (
                    <>Hide extra features <ChevronUp className="ml-1 w-3 h-3" /></>
                ) : (
                    <>Show all {features.length} features <ChevronDown className="ml-1 w-3 h-3" /></>
                )}
            </Button>
        )}
      </CardContent>

      <CardFooter className="pt-4 pb-8 px-6 mt-auto">
        <Button 
          onClick={() => !isCurrent && onSelect(plan)}
          variant={isCurrent ? "outline" : (isPopular ? "default" : "secondary")}
          disabled={isCurrent}
          className={cn(
            "w-full h-12 text-sm font-bold shadow-sm transition-all rounded-xl",
            isCurrent 
                ? "bg-transparent text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20 cursor-default opacity-100" 
                : isPopular
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200 dark:shadow-purple-900/20 hover:shadow-lg hover:scale-[1.02]"
                    : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-lg hover:scale-[1.02]"
          )}
          aria-label={isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
        >
          {isCurrent ? "Current Plan" : "Choose Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MembershipPlanCard;