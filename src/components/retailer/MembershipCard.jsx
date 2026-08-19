import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Calendar, CreditCard, Star } from "lucide-react";
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const MembershipCard = ({ membership, loading, error, onRetry }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="w-full bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-end">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-900">Failed to load membership</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="border-red-200 hover:bg-red-100 text-red-700">
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle no active membership case
  if (!membership || !membership.plan) {
    return (
      <Card className="w-full bg-slate-50 border-dashed border-2 border-slate-300">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
            <Star className="h-6 w-6 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-slate-900">No Active Membership</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Unlock premium features and increase your limits by subscribing to a plan.
            </p>
          </div>
          <Button onClick={() => navigate('/membership-plans')} className="mt-2">
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { plan, membership_start_date, membership_end_date, status } = membership;
  
  const isActive = status?.toLowerCase() === 'active';
  const isExpiringSoon = membership_end_date && new Date(membership_end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const features = Array.isArray(plan.features) ? plan.features : [];

  return (
    <Card className="w-full overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-2 w-full ${isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Current Plan</p>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {plan.name}
            </CardTitle>
          </div>
          <Badge variant={isActive ? "success" : "secondary"} className={`${isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : ""}`}>
            {status || 'Unknown'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price and Expiry */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <span className="text-3xl font-bold text-slate-900">
              ₹{plan.price}
            </span>
            <span className="text-slate-500 ml-1">
               / {plan.duration_days >= 365 ? 'year' : 'month'}
            </span>
          </div>
          
          <div className="flex flex-col items-start sm:items-end text-sm text-slate-600 gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Started: {membership_start_date ? format(new Date(membership_start_date), 'MMM d, yyyy') : 'N/A'}</span>
            </div>
            <div className={`flex items-center gap-2 ${isExpiringSoon ? 'text-amber-600 font-medium' : ''}`}>
              <CreditCard className="h-4 w-4 text-slate-400" />
              <span>Expires: {membership_end_date ? format(new Date(membership_end_date), 'MMM d, yyyy') : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-900 mb-3">Plan Features</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {features.slice(0, 6).map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="leading-tight">{feature}</span>
                </li>
              ))}
              {features.length > 6 && (
                <li className="text-xs text-slate-500 pt-1 italic">
                  + {features.length - 6} more features
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
        <p className="text-xs text-slate-500">
          Plan ID: {plan.id?.slice(0, 8)}...
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/membership-plans')}>
          {isExpiringSoon ? 'Renew Now' : 'Upgrade Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MembershipCard;