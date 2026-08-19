import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, refreshUserProfile } = useAuth();
    const orderId = searchParams.get('order_id');

    const [checking, setChecking] = useState(true);
    const [activationDone, setActivationDone] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [countdown, setCountdown] = useState(5);
    
    // Strict mode safety to ensure single execution
    const activationAttempted = useRef(false);

    useEffect(() => {
        // Wait for user to be loaded
        if (!user) return;
        
        // If no order ID, fail immediately
        if (!orderId) {
            setChecking(false);
            setErrorMsg("No Order ID found in URL.");
            return;
        }

        // Prevent double execution
        if (activationAttempted.current) return;

        const activate = async () => {
            activationAttempted.current = true;
            setChecking(true);
            
            try {
                // Call edge function to verify payment and activate membership
                const { data, error } = await supabase.functions.invoke('activate-membership-from-payment', {
                    body: { 
                        order_id: orderId, 
                        user_id: user.id 
                    }
                });

                if (error) throw error;
                if (!data || !data.success) {
                    throw new Error(data?.message || 'Activation failed or payment not yet confirmed.');
                }

                // On success
                setActivationDone(true);
                await refreshUserProfile();
                
            } catch (err) {
                console.error("Activation failed:", err);
                setErrorMsg(err.message || "Could not activate membership. If payment was deducted, please contact support.");
            } finally {
                setChecking(false);
            }
        };

        activate();

    }, [user, orderId, refreshUserProfile]);

    // Handle auto-redirect countdown
    useEffect(() => {
        if (!activationDone) return;
        
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/dashboard', { replace: true });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [activationDone, navigate]);

    if (checking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Helmet><title>Processing Payment - B2B Nexus</title></Helmet>
                <Card className="w-full max-w-md shadow-xl border-slate-200">
                    <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-6" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Verifying Payment...</h2>
                        <p className="text-slate-500 text-sm max-w-[250px]">
                            Please don't close this window or press the back button while we securely process your payment.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (activationDone) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Helmet><title>Payment Successful - B2B Nexus</title></Helmet>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <Card className="w-full max-w-md shadow-xl border-green-100">
                        <CardHeader className="text-center pb-2">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="mx-auto bg-green-100 p-4 rounded-full mb-4 w-fit"
                            >
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </motion.div>
                            <CardTitle className="text-2xl text-slate-800">Plan Activated!</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-slate-600 mb-6">
                                Your payment was successful and your new membership plan is now active.
                            </p>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6 text-sm text-slate-500 font-mono">
                                Order ID: {orderId}
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3">
                            <Button 
                                onClick={() => navigate('/dashboard', { replace: true })} 
                                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md"
                            >
                                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <p className="text-xs text-slate-400">
                                Redirecting automatically in {countdown} seconds...
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <Helmet><title>Payment Failed - B2B Nexus</title></Helmet>
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <Card className="w-full max-w-md shadow-lg border-red-100">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-red-100 p-4 rounded-full mb-4 w-fit">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl text-red-700">Activation Failed</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-slate-600 mb-4">{errorMsg}</p>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2 text-xs text-slate-500 font-mono break-all">
                            Order ID: {orderId || 'N/A'}
                        </div>
                        <p className="text-xs text-slate-500 mt-4">
                            If the amount was deducted from your account, it will be automatically refunded within 5-7 business days, or the plan will be activated shortly.
                        </p>
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <Button onClick={() => navigate('/membership-plans', { replace: true })} className="w-full">
                            Try Again
                        </Button>
                        <Button onClick={() => navigate('/dashboard', { replace: true })} variant="outline" className="w-full">
                            Return to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default PaymentSuccessPage;