import React from 'react';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import { Loader2, AlertCircle, Info, RefreshCw, Crown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import MembershipPlanDetails from './MembershipPlanDetails';
import NoMembershipState from './NoMembershipState';

const MembershipSettings = () => {
  const navigate = useNavigate();
  const { membership, isLoading, error, refetch, hasActiveMembership } = useActiveMembership();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading membership details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Crown className="w-7 h-7 text-amber-500 fill-amber-500" />
            Membership Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View your active subscription details and plan benefits
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          className="gap-2 bg-white hover:bg-slate-50 text-slate-700 shadow-sm border-slate-200 hover:border-slate-300 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Status
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Membership</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Active Membership Display */}
      {hasActiveMembership && membership?.plan ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Plan Details Card */}
          <MembershipPlanDetails plan={membership.plan} />
          
          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
              Membership Information
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm mt-1">
              Your <strong>{membership.plan.name}</strong> plan provides you with access to all core features.
              To upgrade your plan or modify subscription settings, please contact our support team.
            </AlertDescription>
          </Alert>

          {/* Additional Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              onClick={() => navigate('/membership')}
              variant="outline"
              className="flex-1 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30 font-semibold"
            >
              View All Plans
            </Button>
            <Button 
              onClick={() => window.location.href = 'mailto:support@yourcompany.com'}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              Contact Support
            </Button>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <NoMembershipState />
        </div>
      )}
    </div>
  );
};

export default MembershipSettings;