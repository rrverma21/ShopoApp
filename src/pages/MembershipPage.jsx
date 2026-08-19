import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CashfreePaymentHandler } from '@/lib/CashfreePaymentHandler';

const cardColors = ['#fce1e4', '#fcf4dd', '#ddedea', '#daeaf6'];

const MembershipCard = ({ plan, isCurrent, onSelect, billingCycle, colorIndex }) => {
    const monthlyPrice = plan.price_monthly || plan.price || 0;
    const yearlyPrice = (plan.price_yearly && plan.price_yearly > 0) ? plan.price_yearly : (monthlyPrice * 10);
    const displayPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;
    
    return (
        <div className="p-4 border rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
            <p className="text-2xl font-black mb-4">{formatPrice(displayPrice)} <span className="text-sm font-normal text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'mo'}</span></p>
            <Button onClick={() => onSelect(plan)} disabled={isCurrent} className="w-full">
                {isCurrent ? "Current Plan" : "Select Plan"}
            </Button>
        </div>
    );
};

const MembershipPage = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState('yearly');
    const [cashfree, setCashfree] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            const { data } = await supabase.from('membership_plans').select('*').eq('is_active', true);
            if (data) setPlans(data);
            setLoading(false);
        };
        fetchPlans();
        CashfreePaymentHandler.initializeCashfree(false).then(setCashfree);
    }, []);

    const handlePlanSelect = (plan) => {
        if (!user) {
            navigate('/login?returnUrl=/membership');
            return;
        }
        handleCashfreePayment(plan);
    };

    const handleCashfreePayment = async (plan) => {
        sessionStorage.setItem('pending_plan_id', plan.id);
        sessionStorage.setItem('pending_billing_cycle', billingCycle);

        try {
            if (!user.email) {
                toast({ title: "Email required", description: "Please update your profile with an email address.", variant: "destructive" });
                return;
            }

            const amount = billingCycle === 'yearly' ? (plan.price_yearly || plan.price * 10) : plan.price;
            
            const returnUrl = `${window.location.origin}/payment-success?order_id={order_id}`;

            const payload = {
                amount: Number(amount), 
                user_id: user.id,
                customer_phone: user.phone || '9999999999',
                customer_email: user.email,
                customer_name: user.user_metadata?.businessName || user.email,
                return_url: returnUrl,
                plan_id: plan.id,
                billing_cycle: billingCycle
            };

            const { data: cfData, error } = await supabase.functions.invoke('create-cashfree-order', {
                body: payload
            });

            if (error) throw new Error(error.message);
            if (!cfData.success) {
                if (cfData.missing) {
                    throw new Error(`Missing required fields: ${cfData.missing.join(', ')}`);
                }
                throw new Error(cfData.error || "Payment failed");
            }

            if (cashfree) {
                cashfree.checkout({
                    paymentSessionId: cfData.payment_session_id,
                    redirectTarget: "_self" 
                });
            }
        } catch (e) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8 text-center">Membership Plans</h1>
            <div className="flex justify-center gap-4 mb-8">
                <Button variant={billingCycle === 'monthly' ? 'default' : 'outline'} onClick={() => setBillingCycle('monthly')}>Monthly</Button>
                <Button variant={billingCycle === 'yearly' ? 'default' : 'outline'} onClick={() => setBillingCycle('yearly')}>Yearly (-17%)</Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <MembershipCard 
                        key={plan.id} 
                        plan={plan} 
                        billingCycle={billingCycle} 
                        onSelect={handlePlanSelect} 
                        isCurrent={user?.profile?.membership_plan_id === plan.id}
                        colorIndex={0}
                    />
                ))}
            </div>
        </div>
    );
};

export default MembershipPage;