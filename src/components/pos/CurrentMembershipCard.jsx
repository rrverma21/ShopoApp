import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, ShieldCheck, Box, Users, Smartphone, Infinity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CurrentMembershipCard = ({ membership }) => {
  const plan = membership?.plan || {};
  
  const startDate = membership?.start_date ? new Date(membership.start_date) : null;
  const endDate = membership?.end_date ? new Date(membership.end_date) : null;
  
  // Check if membership is unlimited (end_date is NULL or duration_days is 0)
  const isUnlimited = !endDate || plan.duration_days === 0;
  
  const today = new Date();
  
  // Calculate progress for limited plans only
  let totalDays = 30;
  let remainingDays = 0;
  let progressValue = 100;
  let isExpired = false;

  if (!isUnlimited && endDate && startDate) {
    totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    progressValue = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
    isExpired = remainingDays <= 0;
  }

  // Check membership status
  const isActive = membership?.status === 'active' && (isUnlimited || !isExpired);

  return (
    <Card className="border-slate-200 shadow-lg overflow-hidden transition-all duration-300 bg-white">
      <div className={`h-2 w-full ${isActive ? 'bg-green-600' : 'bg-red-600'}`} />
      
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-red-600'}`} />
              <CardTitle className="text-xl font-bold text-slate-900">
                {plan.name || 'Active Plan'}
              </CardTitle>
              <Badge 
                variant={isActive ? "default" : "destructive"} 
                className={isActive ? "bg-green-500 hover:bg-green-600 text-white border-transparent" : ""}
              >
                {isActive ? 'Active' : 'Expired'}
              </Badge>
              {isUnlimited && (
                <Badge className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300">
                  <Infinity className="h-3 w-3 mr-1" />
                  Unlimited
                </Badge>
              )}
            </div>
            <CardDescription className="text-slate-500">
              {plan.description || 'Premium business tools and features unlocked.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Validity Section */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-slate-600 gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Plan Validity</span>
              </div>
              
              {isUnlimited ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <Infinity className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-bold text-purple-900">Lifetime Access</p>
                      <p className="text-xs text-purple-700">This plan never expires</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Started: {startDate ? format(startDate, 'dd MMM yyyy') : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className={remainingDays < 5 ? "text-orange-600" : "text-slate-700"}>
                      {remainingDays > 0 ? `${remainingDays} Days Left` : 'Period Ended'}
                    </span>
                    <span className="text-slate-500">{Math.round(progressValue)}%</span>
                  </div>
                  <Progress 
                    value={progressValue} 
                    className="h-2 bg-slate-200" 
                    indicatorClassName={remainingDays < 5 ? "bg-orange-500" : "bg-blue-600"} 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                    <span>Starts: {startDate ? format(startDate, 'dd MMM yyyy') : 'N/A'}</span>
                    <span>Ends: {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Plan Limits Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">POS Products</p>
                <div className="flex items-center gap-1 text-slate-800 font-bold text-sm">
                  <Box className="h-3 w-3 text-blue-500" />
                  {plan.max_products || 'Unlmt'}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">POS Users</p>
                <div className="flex items-center gap-1 text-slate-800 font-bold text-sm">
                  <Users className="h-3 w-3 text-purple-500" />
                  {plan.max_pos_users || 'Unlmt'}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Digital Products</p>
                <div className="flex items-center gap-1 text-slate-800 font-bold text-sm">
                  <Smartphone className="h-3 w-3 text-green-500" />
                  {plan.max_digital_products || 'Unlmt'}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Plan Features Grid */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Plan Highlights</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {plan.features && Array.isArray(plan.features) && plan.features.length > 0 ? (
              plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 italic col-span-2">
                Standard Nexus POS Features included.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentMembershipCard;