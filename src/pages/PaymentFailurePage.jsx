import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';

const PaymentFailurePage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        // Log failure attempt if orderId exists
        if (orderId) {
            const logFailure = async () => {
                // We use the same verify endpoint as it syncs status from Cashfree
                // If the user cancelled/failed on Cashfree side, API returns FAILED/DROPPED
                await supabase.functions.invoke('verify-cashfree-payment', {
                    body: { order_id: orderId }
                });
            };
            logFailure();
        }
    }, [orderId]);

    const handleRetry = () => navigate('/membership-plans');
    const handleDashboard = () => navigate('/dashboard');

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 bg-slate-50">
            <Card className="w-full max-w-md shadow-xl border-red-100">
                <div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
                    <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-10 w-10 text-red-600" />
                    </div>
                </div>
                
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-red-900">Payment Failed</CardTitle>
                    <CardDescription className="text-red-700">
                        We couldn't process your payment.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Order Reference</span>
                            <span className="font-mono font-medium text-slate-900">{orderId || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-red-50 rounded text-red-800 text-xs mt-2">
                            This could be due to insufficient funds, card expiry, or a bank decline. No money has been deducted from your account.
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button onClick={handleRetry} className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Retry Payment
                    </Button>
                    <Button variant="ghost" onClick={handleDashboard} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentFailurePage;