import React from 'react';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import { Crown, Calendar, ShieldCheck, AlertTriangle, RefreshCw, Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const MembershipStatusDisplay = () => {
    const navigate = useNavigate();
    const { membership, isLoading, error, refetch, hasActiveMembership } = useActiveMembership();

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <Skeleton className="h-6 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700 font-medium">Failed to load membership details</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
        );
    }

    if (!hasActiveMembership || !membership) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Crown className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No Active Membership</h3>
                    <p className="text-slate-500 mb-6 max-w-sm">Upgrade to a premium plan to unlock advanced features and grow your business.</p>
                    <Button onClick={() => navigate('/membership-plans')} className="bg-blue-600 hover:bg-blue-700 text-white">
                        View Plans
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const rawStartDate = membership.start_date || membership.membership_start_date;
    const rawEndDate = membership.end_date || membership.membership_end_date;
    
    // Check if membership is unlimited
    const isUnlimited = !rawEndDate || membership.plan?.duration_days === 0;
    const isActive = membership.status === 'active' && (isUnlimited || new Date(rawEndDate) > new Date());

    return (
        <Card className={`border-l-4 ${isActive ? 'border-l-green-600' : 'border-l-red-600'} overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh Status">
                    <RefreshCw className="h-4 w-4 text-slate-400" />
                </Button>
            </div>
            
            <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge 
                        variant={isActive ? "default" : "destructive"}
                        className={isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : ""}
                    >
                        {isActive ? 'Active' : 'Expired'}
                    </Badge>
                    {isUnlimited && (
                        <Badge className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300">
                            <Infinity className="h-3 w-3 mr-1" />
                            Unlimited
                        </Badge>
                    )}
                    {membership._source === 'profiles_fallback' && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                            Legacy
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                    {membership.plan?.name || 'Unknown Plan'}
                </CardTitle>
                <CardDescription>
                    {membership.plan?.description || 'Standard membership access'}
                </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Start Date</p>
                                    <p className="font-semibold text-slate-900">
                                        {formatDate(rawStartDate) || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isUnlimited ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isUnlimited ? <Infinity className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Valid Until</p>
                                    <p className="font-semibold text-slate-900">
                                        {isUnlimited ? 'Lifetime' : (formatDate(rawEndDate) || 'N/A')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Plan Features
                        </h4>
                        <ul className="space-y-2">
                            {membership.plan?.features && Array.isArray(membership.plan.features) ? (
                                membership.plan.features.slice(0, 5).map((feature, idx) => (
                                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        {feature}
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm text-slate-500 italic">No features listed</li>
                            )}
                            {membership.plan?.features?.length > 5 && (
                                <li className="text-xs text-blue-600 font-medium pl-3.5">+ {membership.plan.features.length - 5} more</li>
                            )}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MembershipStatusDisplay;