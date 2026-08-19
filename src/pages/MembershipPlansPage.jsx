import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Upload, Ticket, Info, Star, CheckCircle, Droplets, ShieldCheck, Loader2, Zap, AlertTriangle, ChevronDown, ChevronUp, User } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CashfreePaymentHandler } from '@/lib/CashfreePaymentHandler';
import { useActiveMembership } from '@/hooks/useActiveMembership';

// Gradient definitions matching the previous color themes but modernized
const cardGradients = [
    'bg-gradient-to-br from-[#fff0f3] via-[#fff5f7] to-[#ffe6ea] border-rose-200/60 shadow-rose-100', // Rose
    'bg-gradient-to-br from-[#fffbe6] via-[#fffdf0] to-[#fff8cc] border-amber-200/60 shadow-amber-100', // Amber
    'bg-gradient-to-br from-[#e6fffa] via-[#f0fffc] to-[#ccfbf1] border-teal-200/60 shadow-teal-100', // Teal
    'bg-gradient-to-br from-[#e6f7ff] via-[#f0f9ff] to-[#bae6fd] border-blue-200/60 shadow-blue-100'  // Blue
];

const buttonColors = ['bg-rose-500 hover:bg-rose-600 shadow-rose-200', 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200', 'bg-teal-500 hover:bg-teal-600 shadow-teal-200', 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'];
const checkColors = ['text-rose-600 bg-rose-100', 'text-yellow-600 bg-yellow-100', 'text-teal-600 bg-teal-100', 'text-blue-600 bg-blue-100'];
const badgeColors = ['bg-rose-100 text-rose-700', 'bg-yellow-100 text-yellow-700', 'bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700'];

const formatCurrencyDetailed = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const MembershipCard = ({ plan, isCurrent, isPopular, onSelect, billingCycle, colorIndex }) => {
    const monthlyPrice = plan.price_monthly || plan.price || 0;
    const yearlyPrice = (plan.price_yearly && plan.price_yearly > 0) 
        ? plan.price_yearly 
        : (monthlyPrice * 10);

    const displayPrice = yearlyPrice; // Always yearly
    
    const dailyCost = displayPrice / 365;
    
    // We only assume "Months Free" if there's actually a price to pay
    const isPaidPlan = yearlyPrice > 0;
    
    // Dynamic free months value from DB (default to 2 if missing)
    const freeMonths = plan.free_months !== undefined && plan.free_months !== null ? plan.free_months : 2;

    const gradientClass = cardGradients[colorIndex % cardGradients.length];
    const buttonClass = buttonColors[colorIndex % buttonColors.length];
    const checkClass = checkColors[colorIndex % checkColors.length];
    const badgeClass = badgeColors[colorIndex % badgeColors.length];

    const isFreeTrialAndYearly = plan.name === 'FREE TRIAL' && billingCycle === 'yearly';

    const getDisplayFeatures = () => {
        const features = [];
        const planFeatures = plan.features || [];

        if (planFeatures.includes('Point of Sale')) features.push('Point Of Sale (POS)');
        if (plan.max_pos_users > 0) features.push(`${plan.max_pos_users} POS User${plan.max_pos_users > 1 ? 's' : ''}`);
        if (plan.max_products > 0) {
            const label = plan.max_products >= 1000000 ? 'Unlimited Products (POS)' : `${plan.max_products} Products (POS)`;
            features.push(label);
        }
        if (plan.max_digital_products > 0) {
            const label = plan.max_digital_products >= 1000000 ? 'Unlimited Online Products' : `${plan.max_digital_products} Online Products`;
            features.push(label);
        }
        if (planFeatures.includes('Pending/Credit Payments')) features.push('Pending/Credit Payments');
        if (planFeatures.includes('Customers Management')) features.push('Customers Management');
        if (planFeatures.includes('Smart Reorder')) features.push('Smart Reorder');
        if (planFeatures.includes('Sales Reports')) features.push('Sales Reports');
        if (planFeatures.includes('DIOR & GST Register') || planFeatures.includes('DIOR')) features.push('DIOR & GST Register');
        if (planFeatures.includes('Water Order')) features.push('Water Order');

        return features;
    };

    const displayFeatures = getDisplayFeatures();

    const getFeatureIcon = (featureName) => {
        switch (featureName) {
            case 'Water Order':
                return <Droplets className="w-3.5 h-3.5 stroke-[3]" />;
            default:
                return <Check className="w-3.5 h-3.5 stroke-[3]" />;
        }
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
            }}
            className="h-full"
        >
            <div 
                className={`relative h-full flex flex-col rounded-[2rem] overflow-hidden border transition-all duration-300 ${gradientClass} ${isPopular || isCurrent ? 'ring-2 ring-offset-4 ring-yellow-400 shadow-2xl scale-[1.02]' : 'shadow-xl hover:shadow-2xl hover:-translate-y-1'}`}
            >
                {isPopular && !isCurrent && (
                    <div className="absolute top-0 right-0 z-10">
                        <div className="bg-yellow-400 text-white text-[10px] font-black tracking-wider px-4 py-1.5 rounded-bl-2xl shadow-md uppercase flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" /> Popular
                        </div>
                    </div>
                )}
                
                {isCurrent && (
                    <div className="absolute top-0 right-0 z-10">
                        <div className="bg-green-500 text-white text-[10px] font-black tracking-wider px-4 py-1.5 rounded-bl-2xl shadow-md uppercase flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 fill-current" /> Current Plan
                        </div>
                    </div>
                )}
                
                <div className="p-8 pt-10 flex-grow">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight uppercase opacity-70 mb-4">{plan.name}</h3>
                        
                        <div className="flex flex-col">
                            {/* Main Price */}
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">
                                    {formatCurrencyDetailed(displayPrice)}
                                </span>
                                <span className="text-lg font-bold text-slate-500">
                                    /year
                                </span>
                            </div>

                            {/* Free Months Badge */}
                            {isPaidPlan && (
                                <div className="mt-3 space-y-2">
                                    <div>
                                        {/* Show dynamic free_months */}
                                        <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                            {freeMonths} Months Free
                                        </span>
                                    </div>
                                    {/* Daily Breakdown */}
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                        Roughly {formatCurrencyDetailed(dailyCost)} / day
                                    </div>
                                </div>
                            )}
                            
                            {!isPaidPlan && (
                                <div className="mt-3">
                                    <span className="text-sm font-medium text-slate-500">Free for trial period</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="h-px bg-slate-900/5 w-full"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Includes:</p>
                        <ul className="space-y-3.5">
                            {displayFeatures.map((feature, i) => (
                                <li key={i} className="flex items-start text-sm font-medium text-slate-700">
                                    <div className={`mt-0.5 mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${checkClass}`}>
                                        {getFeatureIcon(feature)}
                                    </div>
                                    <span className="leading-tight pt-0.5">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="p-8 pt-0 mt-auto">
                    <button
                        onClick={() => !isCurrent && !isFreeTrialAndYearly && onSelect(plan)}
                        disabled={isCurrent || isFreeTrialAndYearly}
                        className={`w-full py-4 rounded-xl text-sm font-bold tracking-wide uppercase shadow-lg transition-all active:scale-[0.98] ${
                            isCurrent 
                                ? 'bg-slate-900/5 text-slate-400 cursor-not-allowed shadow-none' 
                                : isFreeTrialAndYearly 
                                    ? 'bg-slate-900/5 text-slate-400 cursor-not-allowed shadow-none' 
                                    : `${buttonClass} text-white`
                        }`}
                    >
                        {isCurrent ? 'Current Plan' : (isFreeTrialAndYearly ? 'Not Available Yearly' : 'Get Started')}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const MembershipPlansPage = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [receiptFile, setReceiptFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [adminQrCode, setAdminQrCode] = useState(null);
    const [adminUpi, setAdminUpi] = useState(null);
    const [pendingPayment, setPendingPayment] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discountedPrice, setDiscountedPrice] = useState(0);
    const billingCycle = 'yearly'; // Forced to yearly
    
    // Payment Form State
    const [paymentForm, setPaymentForm] = useState({ name: '', email: '', phone: '' });
    const [formErrors, setFormErrors] = useState({});
    const [profileLoading, setProfileLoading] = useState(false);
    const [sourceInfo, setSourceInfo] = useState({ name: '', email: '', phone: '' });

    const [cashfree, setCashfree] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showManualPayment, setShowManualPayment] = useState(false);

    const { user } = useAuth();
    const { membership, refetch: refetchMembership } = useActiveMembership();
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            refetchMembership();
        }
    }, [user, refetchMembership]);

    // Fetch Profile Data on Dialog Open
    useEffect(() => {
        if (isPaymentDialogOpen && user) {
            const fetchProfileForPayment = async () => {
                setProfileLoading(true);
                try {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('phone, contact_person, business_name')
                        .eq('id', user.id)
                        .limit(1)
                        .maybeSingle();

                    if (error) {
                        console.error('Error fetching profile:', error);
                    }

                    const preFilledName = profile?.contact_person || profile?.business_name || user.user_metadata?.businessName || '';
                    const preFilledPhone = profile?.phone || user.phone || '';
                    const preFilledEmail = user.email || '';

                    setPaymentForm(prev => ({
                        name: prev.name || preFilledName,
                        email: prev.email || preFilledEmail,
                        phone: prev.phone || preFilledPhone
                    }));

                    setSourceInfo({
                        name: profile?.contact_person || profile?.business_name ? 'Profile' : (user.user_metadata?.businessName ? 'Auth' : ''),
                        phone: profile?.phone ? 'Profile' : (user.phone ? 'Auth' : ''),
                        email: user.email ? 'Account' : ''
                    });

                } catch (err) {
                    console.error('Profile fetch unexpected error:', err);
                    toast({
                        title: "Notice",
                        description: "Could not auto-load profile details. Please enter manually.",
                        variant: "default"
                    });
                } finally {
                    setProfileLoading(false);
                }
            };

            fetchProfileForPayment();
        }
    }, [isPaymentDialogOpen, user, toast]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        
        const { data: adminSettings } = await supabase
            .from('site_settings')
            .select('key, value')
            .in('key', ['admin_payment_qr', 'admin_payment_upi']);
            
        if (adminSettings) {
            const qr = adminSettings.find(s => s.key === 'admin_payment_qr')?.value;
            const upi = adminSettings.find(s => s.key === 'admin_payment_upi')?.value;
            setAdminQrCode(qr);
            setAdminUpi(upi);
        }

        const { data: plansData, error: plansError } = await supabase
            .from('membership_plans')
            .select('*')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });
        
        if (plansError) {
            toast({ title: "Error fetching plans", description: plansError.message, variant: 'destructive' });
        } else {
            const customOrder = ["FREE TRIAL", "Starter", "Growth", "Pro Business"];
            const safePlansData = plansData || [];
            const sortedPlans = [...safePlansData].sort((a, b) => {
                const indexA = customOrder.indexOf(a.name);
                const indexB = customOrder.indexOf(b.name);
                if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
            setPlans(sortedPlans);
        }

        if (user) {
            const { data: paymentData } = await supabase
                .from('membership_payments')
                .select('*, plan:plan_id(name)')
                .eq('seller_id', user.id)
                .eq('status', 'pending')
                .limit(1)
                .maybeSingle();
            
            if (paymentData) {
                setPendingPayment(paymentData);
            }
        }

        setLoading(false);
    }, [toast, user]);

    useEffect(() => {
        fetchInitialData();
        CashfreePaymentHandler.initializeCashfree(false).then(cf => {
            setCashfree(cf);
        });
    }, [fetchInitialData]);

    const handlePlanSelect = (plan) => {
        if (!user) {
             toast({ 
                 title: "Login Required", 
                 description: "Please log in to select a membership plan.", 
                 variant: "destructive" 
             });
             navigate('/login?returnUrl=/membership-plans');
             return;
        }

        const monthlyPrice = plan.price_monthly || plan.price || 0;
        const yearlyPrice = (plan.price_yearly && plan.price_yearly > 0) 
            ? plan.price_yearly 
            : (monthlyPrice * 10);
        
        // Always force yearly price
        const price = yearlyPrice;
        
        setSelectedPlan(plan);
        setDiscountedPrice(price);
        setCouponCode('');
        setAppliedCoupon(null);
        setShowManualPayment(false);
        setPaymentForm({ name: '', email: '', phone: '' }); 
        setFormErrors({});
        setIsPaymentDialogOpen(true);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            toast({ title: "Invalid Coupon", description: "Please enter a coupon code.", variant: 'destructive' });
            return;
        }

        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', couponCode.trim().toUpperCase())
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            toast({ title: "Invalid Coupon", description: "This coupon is not valid or has expired.", variant: 'destructive' });
            return;
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            toast({ title: "Expired Coupon", description: "This coupon has expired.", variant: 'destructive' });
            return;
        }
        
        if (data.usage_limit && data.usage_count >= data.usage_limit) {
            toast({ title: "Coupon Limit Reached", description: "This coupon has reached its usage limit.", variant: 'destructive' });
            return;
        }

        const monthlyPrice = selectedPlan.price_monthly || selectedPlan.price || 0;
        const yearlyPrice = (selectedPlan.price_yearly && selectedPlan.price_yearly > 0) 
            ? selectedPlan.price_yearly 
            : (monthlyPrice * 10);
            
        // Force yearly calculation
        const currentPrice = yearlyPrice;
        
        let newPrice = currentPrice;
        
        if (data.discount_type === 'percentage') {
            newPrice = currentPrice * (1 - data.discount_value / 100);
        } else {
            newPrice = currentPrice - data.discount_value;
        }

        setDiscountedPrice(Math.max(0, newPrice));
        setAppliedCoupon(data);
        toast({ title: "Coupon Applied!", description: "Discount has been applied to your plan." });
    };

    const validateForm = () => {
        const errors = {};
        if (!paymentForm.name.trim()) errors.name = "Full Name is required";
        if (!paymentForm.email.trim()) errors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentForm.email)) errors.email = "Invalid email format";
        
        if (!paymentForm.phone.trim()) errors.phone = "Phone number is required";
        else if (!/^\d{10}$/.test(paymentForm.phone.replace(/\D/g, ''))) errors.phone = "Phone must be exactly 10 digits";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCashfreePayment = async () => {
        if (!validateForm()) {
            toast({ title: "Validation Error", description: "Please correct the errors in the form.", variant: "destructive" });
            return;
        }

        setProcessingPayment(true);
        console.log('[Membership] Starting payment flow');

        sessionStorage.setItem('pending_plan_id', selectedPlan.id);
        sessionStorage.setItem('pending_billing_cycle', billingCycle);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                toast({ title: "Session Error", description: "Your session has expired. Please log in again.", variant: "destructive" });
                navigate('/login?returnUrl=/membership-plans');
                return;
            }

            const currentUser = session.user;
            
            const { data: planData, error: planError } = await supabase
                .from('membership_plans')
                .select('*')
                .eq('id', selectedPlan.id)
                .single();

            if (planError || !planData) {
                throw new Error("Could not verify plan details.");
            }

            // Always calculate yearly amount
            const originalAmount = (planData.price_yearly && planData.price_yearly > 0) ? planData.price_yearly : (planData.price_monthly || planData.price) * 10;

            let finalAmount = originalAmount;
            let couponCodeUsed = null;
            let discountPercentage = 0;

            if (appliedCoupon) {
                couponCodeUsed = appliedCoupon.code;
                if (appliedCoupon.discount_type === 'percentage') {
                    discountPercentage = appliedCoupon.discount_value;
                    finalAmount = originalAmount - (originalAmount * discountPercentage / 100);
                } else {
                    finalAmount = Math.max(0, originalAmount - appliedCoupon.discount_value);
                    if (originalAmount > 0) {
                        discountPercentage = ((originalAmount - finalAmount) / originalAmount) * 100;
                    }
                }
            }

            const orderAmount = Number(finalAmount.toFixed(2));
            const returnUrl = `${window.location.origin}/payment-success?order_id={order_id}`;
            
            const payload = {
                plan_id: selectedPlan.id,
                user_id: currentUser.id,
                amount: orderAmount,
                billing_cycle: billingCycle,
                customer_phone: paymentForm.phone,
                customer_email: paymentForm.email,
                customer_name: paymentForm.name,
                return_url: returnUrl,
                coupon_code: couponCodeUsed,
                discounted_amount: orderAmount
            };

            const { data: cfData, error: cfError } = await supabase.functions.invoke('create-cashfree-order', {
                body: payload
            });

            if (cfError) {
                console.error('[Membership] Edge Function Error:', cfError);
                throw new Error(cfError.message || "Server communication failed.");
            }
            
            if (!cfData.success) {
                 console.error('[Membership] Gateway Error:', cfData);
                 if (cfData.missing && Array.isArray(cfData.missing)) {
                     const missingStr = cfData.missing.join(", ");
                     throw new Error(`Please update your profile. Missing: ${missingStr}`);
                 }
                 throw new Error(cfData.error || "Payment initialization failed.");
            }

            if (cfData.payment_session_id && cashfree) {
                await cashfree.checkout({
                    paymentSessionId: cfData.payment_session_id,
                    redirectTarget: "_self" 
                });
            } else {
                throw new Error("Payment SDK not ready or invalid session.");
            }

        } catch (error) {
            console.error('[Membership] Process failed:', error);
            toast({ title: "Payment Error", description: error.message, variant: "destructive" });
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleManualPaymentSubmit = async () => {
        if (!validateForm()) {
            toast({ title: "Validation Error", description: "Please fill in your contact details correctly.", variant: "destructive" });
            return;
        }

        if (!receiptFile || !selectedPlan || !user) return;
        setUploading(true);
    
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
    
        const { error: uploadError } = await supabase.storage
            .from('membership-receipts')
            .upload(filePath, receiptFile);
    
        if (uploadError) {
            toast({ title: "Upload Failed", description: uploadError.message, variant: 'destructive' });
            setUploading(false);
            return;
        }
    
        const { data: { publicUrl } } = supabase.storage.from('membership-receipts').getPublicUrl(filePath);
    
        let dbError;
        const paymentData = {
            plan_id: selectedPlan.id,
            receipt_url: publicUrl,
            coupon_id: appliedCoupon?.id,
            created_at: new Date().toISOString(),
            status: 'pending',
            billing_cycle: billingCycle,
            amount: discountedPrice,
        };
    
        if (pendingPayment) {
            const { error: updateError } = await supabase
                .from('membership_payments')
                .update(paymentData)
                .eq('id', pendingPayment.id);
            dbError = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('membership_payments')
                .insert({
                    ...paymentData,
                    seller_id: user.id
                });
            dbError = insertError;
        }
    
        if (dbError) {
            toast({ title: "Submission Failed", description: dbError.message, variant: 'destructive' });
        } else {
            toast({ title: "Success!", description: "Your payment receipt has been submitted for review." });
            setIsPaymentDialogOpen(false);
            fetchInitialData();
        }
        setUploading(false);
    };

    const currentPlanId = membership?.plan_id;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    return (
        <>
            <Helmet>
                <title>Membership Plans - B2B Nexus</title>
                <meta name="description" content="Upgrade your business with premium POS features." />
            </Helmet>
            <div className="container mx-auto px-4 py-8 md:py-16">
                
                <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
                   <div>
                      <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
                          Unlock Premium Tools
                      </h1>
                      <p className="text-slate-500 text-lg leading-relaxed mb-6">
                          Get access to advanced POS features, inventory management, and digital shop capabilities. 
                          Choose a plan that fits your business scale.
                      </p>
                   </div>
                   <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                      <img 
                        src="https://images.unsplash.com/photo-1654588836190-d8e6c12122f8" 
                        alt="Secure Payment Processing" 
                        className="w-full h-64 object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                         <p className="text-white font-medium flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-400" /> Secure SSL Payment
                         </p>
                      </div>
                   </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-64 gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                            <p className="text-slate-500 font-medium">Loading plans...</p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {pendingPayment && (
                                <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-amber-900">Upgrade Pending Approval</h3>
                                        <p className="text-sm text-amber-700 font-medium">
                                            Your request for <strong>{pendingPayment.plan.name} ({pendingPayment.billing_cycle || 'monthly'})</strong> is under review.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-center mb-8">
                                <div className="bg-slate-100 px-6 py-2 rounded-full flex items-center gap-2 shadow-sm">
                                    <span className="text-slate-900 font-bold text-sm">Yearly Billing</span>
                                    <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wide shadow-sm">
                                        -17%
                                    </span>
                                </div>
                            </div>
                            
                            <motion.div
                                className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {plans.map((plan, index) => {
                                    const isCurrent = currentPlanId === plan.id;
                                    const isPopular = plan.is_featured;
                                    
                                    return (
                                        <div key={plan.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-[calc(25%-2rem)] flex-shrink-0">
                                            <MembershipCard
                                                plan={plan}
                                                isCurrent={isCurrent}
                                                isPopular={isPopular}
                                                onSelect={handlePlanSelect}
                                                billingCycle={billingCycle}
                                                colorIndex={index}
                                            />
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </div>

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-0 flex flex-col max-h-[90vh]">
                    <div className="bg-slate-50 px-6 py-6 border-b border-slate-100 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Upgrade to {selectedPlan?.name}</DialogTitle>
                            <DialogDescription className="text-base">
                                Complete your payment to activate this plan immediately.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" />
                                Billing Details
                            </h3>
                            {profileLoading ? (
                                <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
                                    <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div>
                                    <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse"></div>
                                    <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name / Business Name</Label>
                                        <div className="relative">
                                            <Input
                                                id="name"
                                                value={paymentForm.name}
                                                onChange={(e) => {
                                                    setPaymentForm(prev => ({...prev, name: e.target.value}));
                                                    setSourceInfo(prev => ({...prev, name: 'Manual'}));
                                                }}
                                                placeholder="Enter full name"
                                                className={formErrors.name ? "border-red-500" : ""}
                                            />
                                            {sourceInfo.name === 'Profile' && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                    From Profile
                                                </span>
                                            )}
                                        </div>
                                        {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <div className="relative">
                                                <Input
                                                    id="phone"
                                                    value={paymentForm.phone}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setPaymentForm(prev => ({...prev, phone: val}));
                                                        setSourceInfo(prev => ({...prev, phone: 'Manual'}));
                                                    }}
                                                    placeholder="9876543210"
                                                    type="tel"
                                                    className={formErrors.phone ? "border-red-500" : ""}
                                                />
                                                {sourceInfo.phone === 'Profile' && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                        From Profile
                                                    </span>
                                                )}
                                            </div>
                                            {formErrors.phone && <p className="text-xs text-red-500">{formErrors.phone}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <div className="relative">
                                                <Input
                                                    id="email"
                                                    value={paymentForm.email}
                                                    onChange={(e) => {
                                                        setPaymentForm(prev => ({...prev, email: e.target.value}));
                                                        setSourceInfo(prev => ({...prev, email: 'Manual'}));
                                                    }}
                                                    placeholder="name@example.com"
                                                    type="email"
                                                    className={formErrors.email ? "border-red-500" : ""}
                                                />
                                                {sourceInfo.email === 'Account' && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                        Account
                                                    </span>
                                                )}
                                            </div>
                                            {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-slate-600">Plan ({billingCycle})</span>
                                <span className="text-slate-900">
                                    {formatPrice(
                                        (selectedPlan?.price_yearly && selectedPlan?.price_yearly > 0) ? selectedPlan.price_yearly : (selectedPlan?.price_monthly || selectedPlan?.price || 0) * 10
                                    )}
                                </span>
                            </div>
                            {appliedCoupon && (
                                <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                                    <span className="flex items-center gap-1"><Ticket className="w-3 h-3"/> Coupon ({appliedCoupon.code})</span>
                                    <span>- {formatPrice((
                                        (selectedPlan?.price_yearly && selectedPlan?.price_yearly > 0) ? selectedPlan.price_yearly : (selectedPlan?.price_monthly || selectedPlan?.price || 0) * 10
                                    ) - discountedPrice)}</span>
                                </div>
                            )}
                            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                <span className="font-bold text-slate-900">Total Payable</span>
                                <span className="font-black text-2xl text-blue-600">{formatPrice(discountedPrice)}</span>
                            </div>
                        </div>

                        {!appliedCoupon && (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Enter coupon code" 
                                        value={couponCode} 
                                        onChange={e => setCouponCode(e.target.value)} 
                                        className="pl-9 h-11"
                                    />
                                </div>
                                <Button variant="outline" onClick={handleApplyCoupon} className="h-11 px-6 font-semibold">Apply</Button>
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <Button 
                                onClick={handleCashfreePayment}
                                disabled={processingPayment || profileLoading}
                                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                {processingPayment ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                                ) : (
                                    <><ShieldCheck className="h-5 w-5" /> Pay Securely with Cashfree</>
                                )}
                            </Button>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                                    <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Secured by Cashfree Payments
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setShowManualPayment(!showManualPayment)}
                                    className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1 w-full"
                                >
                                    Having trouble? Use Manual Payment
                                    {showManualPayment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>

                                {showManualPayment && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} 
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 space-y-6"
                                    >
                                        <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                            <AlertTitle className="text-yellow-800 text-xs font-bold">Manual Verification Required</AlertTitle>
                                            <AlertDescription className="text-yellow-700 text-xs">
                                                Manual payments require admin verification which may take 24-48 hours.
                                            </AlertDescription>
                                        </Alert>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">1</div>
                                                <h3 className="font-bold text-slate-900 text-sm">Scan QR Code</h3>
                                            </div>
                                            
                                            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-4 bg-white">
                                                {adminQrCode ? (
                                                    <img src={adminQrCode} alt="Payment QR" className="w-40 h-40 object-contain mix-blend-multiply" />
                                                ) : (
                                                    <div className="w-40 h-40 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium">
                                                        No QR Code
                                                    </div>
                                                )}
                                                
                                                {adminUpi && (
                                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg text-xs text-slate-700 w-full justify-between border border-slate-100">
                                                        <span className="font-mono font-medium tracking-wide">{adminUpi}</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {navigator.clipboard.writeText(adminUpi); toast({title:"Copied UPI"})}}>
                                                            <CheckCircle className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">2</div>
                                                <h3 className="font-bold text-slate-900 text-sm">Upload Screenshot</h3>
                                            </div>
                                            
                                            <div className="group border-2 border-dashed border-slate-300 rounded-xl p-6 hover:bg-slate-50 hover:border-slate-400 transition-all text-center cursor-pointer relative bg-slate-50/50">
                                                <Input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleFileChange} 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                />
                                                {receiptFile ? (
                                                    <div className="flex flex-col items-center justify-center gap-1 text-green-600">
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span className="text-xs font-bold">{receiptFile.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-slate-500">
                                                        <Upload className="w-5 h-5" />
                                                        <p className="text-xs font-bold text-slate-700">Click to upload</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <Button 
                                                onClick={handleManualPaymentSubmit} 
                                                disabled={!receiptFile || uploading}
                                                variant="secondary"
                                                className="w-full mt-2"
                                            >
                                                {uploading ? 'Uploading...' : 'Submit Manual Request'}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MembershipPlansPage;