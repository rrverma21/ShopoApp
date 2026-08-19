import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Package, ShoppingBag, Users, Infinity, DollarSign, Calendar, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const MembershipPlanDetails = ({ plan, className = '' }) => {
  if (!plan) {
    return (
      <Card className={`border-slate-200 shadow-sm ${className}`}>
        <CardContent className="p-6 text-center text-slate-500">
          No plan details available
        </CardContent>
      </Card>
    );
  }

  const isFreePlan = plan.price === 0;
  const isUnlimited = plan.duration_days === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="border-blue-100 dark:border-blue-900/50 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        {/* Header with gradient */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <CardHeader className="pb-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
                  {plan.name}
                </CardTitle>
                {isFreePlan && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-3 py-1 text-sm font-semibold shadow-sm">
                    FREE
                  </Badge>
                )}
              </div>
              <CardDescription className="text-slate-600 dark:text-slate-300 text-base">
                {plan.description || 'Perfect for getting started with your business'}
              </CardDescription>
            </div>
          </div>

          {/* Pricing & Duration */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">
                <DollarSign className="w-4 h-4" />
                <span>Price</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {isFreePlan ? 'Free' : `₹${plan.price}`}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4" />
                <span>Duration</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isUnlimited ? (
                  <>
                    <Infinity className="w-7 h-7 text-blue-500" />
                    <span className="text-xl">Unlimited</span>
                  </>
                ) : (
                  `${plan.duration_days} days`
                )}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Product Limits */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Product Limits</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* POS Products */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">POS Products</span>
                </div>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 ml-1">
                  {plan.max_products || 0}
                </p>
              </div>

              {/* Digital Shop Products */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Digital Shop</span>
                </div>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 ml-1">
                  {plan.max_digital_products || 0}
                </p>
              </div>

              {/* POS Users */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">POS Users</span>
                </div>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 ml-1">
                  {plan.max_pos_users || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Features List */}
          {plan.features && plan.features.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500" />
                Included Features
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plan.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 hover:shadow-sm transition-all group"
                  >
                    <div className="mt-0.5 p-1.5 bg-green-50 dark:bg-green-950/30 rounded-full group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MembershipPlanDetails;