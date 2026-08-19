import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2, ArrowUpCircle, CheckCircle } from 'lucide-react';

/**
 * FIXED: FeatureGuard component with proper free plan support
 * 
 * Key fixes:
 * - Correctly uses usePlanLimits.hasFeature() which now checks expiry + features
 * - Shows appropriate messages for expired vs missing feature
 * - Free plans with POS feature will pass through
 * - Better UX with clear upgrade paths
 */
const FeatureGuard = ({ feature, children }) => {
    const { hasFeature, isLoading, planName, hasPlanExpired, features } = usePlanLimits();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // CRITICAL: hasFeature() now internally checks both expiry and feature availability
    const hasAccess = hasFeature(feature);

    if (import.meta.env.DEV) {
        console.log('[FeatureGuard] Check:', {
            feature,
            hasAccess,
            planName,
            hasPlanExpired,
            features
        });
    }

    if (!hasAccess) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center p-4">
                <Card className="w-full max-w-md border-2 border-red-100 bg-red-50/50 dark:bg-red-900/10 shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                            <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-xl text-red-700 dark:text-red-400">
                            {hasPlanExpired ? 'Plan Expired' : 'Feature Not Available'}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {hasPlanExpired 
                                ? 'Your membership plan has expired and needs renewal.' 
                                : (
                                    <span>
                                        The <strong>"{feature}"</strong> feature is not included in your <strong>{planName}</strong> plan.
                                    </span>
                                )
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="rounded-lg bg-white/50 dark:bg-black/20 p-4 text-center text-sm text-muted-foreground border border-red-100 dark:border-red-900/20">
                            {hasPlanExpired ? (
                                <p>Renew your plan to restore access to all features.</p>
                            ) : (
                                <p>Upgrade your plan to unlock <span className="font-semibold text-foreground">"{feature}"</span> and other premium features.</p>
                            )}
                        </div>

                        {/* Show current plan features */}
                        {!hasPlanExpired && features && features.length > 0 && (
                            <div className="text-sm">
                                <p className="font-medium mb-2 text-foreground">Your current plan includes:</p>
                                <ul className="space-y-1">
                                    {features.slice(0, 3).map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                    {features.length > 3 && (
                                        <li className="text-xs text-muted-foreground/70">
                                            +{features.length - 3} more features
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div className="grid gap-3">
                            <Button 
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all" 
                                onClick={() => navigate('/membership')}
                            >
                                <ArrowUpCircle className="mr-2 h-4 w-4" />
                                {hasPlanExpired ? 'Renew Plan' : 'Upgrade Plan'}
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-700" 
                                onClick={() => navigate(-1)}
                            >
                                Go Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return children;
};

export default FeatureGuard;