import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Shield } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const AvailableMembershipPlans = ({ plans, currentPlanId, isLoading, onSelectPlan }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse h-[420px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
            <CardHeader className="space-y-4 pb-8 pt-8">
              <div className="h-8 w-1/2 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
              <div className="h-10 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 px-4">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
        <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No other membership plans available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Available Plans
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-base">
            Choose the perfect plan to scale your business. Upgrade anytime to unlock more features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 xl:px-8">
        {plans.map((plan, index) => {
          const isCurrent = currentPlanId === plan.id;
          const isPopular = plan.is_featured;

          return (
            <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                whileHover={{ y: -5 }}
                className="h-full"
            >
                <Card 
                  className={cn(
                    "relative flex flex-col h-full transition-all duration-300 border rounded-2xl overflow-visible",
                    isCurrent 
                      ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20" 
                      : isPopular 
                        ? "border-purple-500 dark:border-purple-400 bg-white dark:bg-slate-900 shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/20 scale-[1.02] md:scale-105 z-10" 
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-black/40"
                  )}
                >
                  {isCurrent && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-blue-600/20 flex items-center gap-1.5 z-20">
                      <Check className="w-3.5 h-3.5 stroke-[3px]" /> Current Plan
                    </div>
                  )}
                  
                  {isPopular && !isCurrent && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-purple-600/30 flex items-center gap-1.5 z-20">
                      <Crown className="w-3.5 h-3.5 fill-current" /> Most Popular
                    </div>
                  )}

                  <CardHeader className={cn("text-center pb-2 pt-10 rounded-t-2xl", isPopular && "bg-slate-50/50 dark:bg-slate-800/30")}>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</CardTitle>
                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{formatPrice(plan.price)}</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/{plan.duration_days} days</span>
                    </div>
                    {plan.description && (
                      <CardDescription className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 px-2">
                        {plan.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex-grow pt-6">
                    <div className="space-y-4">
                      {/* Key Stats Highlights */}
                      <div className="grid grid-cols-2 gap-2 mb-6">
                          <div className="text-center p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Products</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{plan.max_products || '∞'}</div>
                          </div>
                          <div className="text-center p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Staff</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{plan.max_employees || 0}</div>
                          </div>
                      </div>

                      <div className="space-y-3">
                          {plan.features && plan.features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className={cn("mt-0.5 rounded-full p-1 shrink-0", isPopular ? "bg-purple-100 dark:bg-purple-900/30" : "bg-green-100 dark:bg-green-900/30")}>
                                <Check className={cn("h-3 w-3", isPopular ? "text-purple-600 dark:text-purple-400" : "text-green-600 dark:text-green-400")} />
                              </div>
                              <span className="leading-snug">{feature}</span>
                            </div>
                          ))}
                          
                          {/* Implicit feature */}
                          <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className={cn("mt-0.5 rounded-full p-1 shrink-0", isPopular ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30")}>
                              <Zap className={cn("h-3 w-3", isPopular ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400")} />
                            </div>
                            <span className="leading-snug">
                                {plan.max_pincodes || 1} Service Area{plan.max_pincodes > 1 ? 's' : ''}
                            </span>
                          </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-6 pb-8 px-6">
                    <Button 
                      onClick={() => !isCurrent && onSelectPlan(plan)}
                      variant={isCurrent ? "outline" : (isPopular ? "default" : "secondary")}
                      disabled={isCurrent}
                      className={cn(
                        "w-full h-12 text-base font-semibold shadow-sm transition-all rounded-xl",
                        isCurrent 
                            ? "bg-transparent text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-default opacity-80" 
                            : isPopular
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200 dark:shadow-none hover:shadow-lg hover:scale-[1.02]"
                                : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-lg hover:scale-[1.02]"
                      )}
                    >
                      {isCurrent ? "Current Plan" : "Get Started"}
                    </Button>
                  </CardFooter>
                </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailableMembershipPlans;