import React, { useState } from 'react';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import { Loader2, AlertCircle, Info, CreditCard, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import CurrentMembershipCard from './CurrentMembershipCard';
import NoMembershipState from './NoMembershipState';

const MembershipSettingsTab = () => {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    
    // Utilize the hook which now uses AuthContext to prevent duplicate fetches
    const { membership, isLoading, error, refetch, hasActiveMembership } = useActiveMembership();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 min-h-[400px]">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-blue-600 animate-pulse" />
                    </div>
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Loading membership details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-8 px-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unable to load membership</AlertTitle>
                    <AlertDescription>
                        {error?.message || "Something went wrong while fetching your plan details. Please try again."}
                        <div className="mt-2">
                            <button 
                                onClick={() => refetch()} 
                                className="text-sm font-semibold underline hover:text-red-800"
                            >
                                Retry
                            </button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Membership Management</h2>
                    <p className="text-slate-500 dark:text-slate-400">View your active subscription details and plan benefits.</p>
                </div>
                <Button 
                    onClick={() => setShowPaymentForm(true)} 
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm"
                >
                    <CreditCard className="w-4 h-4" /> Make Payments
                </Button>
            </div>

            {hasActiveMembership && membership ? (
                <div className="space-y-6">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CurrentMembershipCard membership={membership} />
                    </div>
                    
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                            To modify your subscription, change plan levels, or cancel, please contact our support team or visit the main account billing portal.
                        </AlertDescription>
                    </Alert>
                </div>
            ) : (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    <NoMembershipState />
                </div>
            )}

            {/* Payment Form Dialog */}
            <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                            Secure Payment
                        </DialogTitle>
                        <DialogDescription>
                            Complete your transaction securely via our payment partner.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-8 flex flex-col items-center justify-center space-y-6">
                        <div className="w-full max-w-[280px]">
                            <Button 
                                asChild
                                className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <a 
                                    href="https://payments.cashfree.com/forms/posfees" 
                                    target="_parent" 
                                    rel="noopener noreferrer"
                                    aria-label="Pay Now with Cashfree"
                                    role="button"
                                >
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Pay Now
                                </a>
                            </Button>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span>Powered By</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Cashfree</span>
                            <span>Payments</span>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
                        <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MembershipSettingsTab;