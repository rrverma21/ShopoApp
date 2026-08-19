import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Smartphone, Lock, ShoppingBag, Receipt, Calendar as CalendarIcon, MapPin, ChevronDown, ChevronUp, ArrowLeft, TrendingUp, IndianRupee, RefreshCw, LogIn, Search, Filter, Percent, Download, CreditCard, Clock, History, Coins, Award, Gift, Milk, Droplets, Truck, ArrowRight, Hourglass, Star, PlusCircle, Share2, Mail, CheckCircle2, Users, Trophy, Copy, FileText } from 'lucide-react';
import { formatPrice, cn, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, subDays, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import MilkSubscriptionCard from '@/components/customer/MilkSubscriptionCard';
import ContributeProductForm from '@/components/ContributeProductForm';
import { getReferralStats, getReferralHistory } from '@/services/referralService';
import MSG91OTPWidget from '@/components/auth/MSG91OTPWidget';

const withTimeout = async (promise, timeoutMs = 8000) => {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
};

const CustomerPurchaseHistory = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Step Management: 'phone' -> ('login' OR 'onboarding_otp') -> 'onboarding_passcode' -> 'history'
  const [step, setStep] = useState('phone');

  // Data States
  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [otpToken, setOtpToken] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('purchases');

  // Data Fetched
  const [purchases, setPurchases] = useState([]);
  const [creditData, setCreditData] = useState({
    total_due: 0,
    invoices: [],
    payments: []
  });
  const [loyaltyData, setLoyaltyData] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [expandedSale, setExpandedSale] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [waterOrders, setWaterOrders] = useState([]);
  const [waterOrdersLoading, setWaterOrdersLoading] = useState(false);

  // Referral States
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [referralLink, setReferralLink] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalInvites, setTotalInvites] = useState(0);
  const [successfulReferrals, setSuccessfulReferrals] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [referralHistory, setReferralHistory] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Tab Configuration
  const tabConfig = [{
    id: 'purchases',
    label: 'History',
    icon: Clock,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    borderClass: 'bg-blue-600',
    activeShadow: 'shadow-blue-100'
  }, {
    id: 'credit',
    label: 'Pending',
    icon: Hourglass,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50',
    borderClass: 'bg-orange-600',
    activeShadow: 'shadow-orange-100'
  }, {
    id: 'milk',
    label: 'Milk',
    icon: Milk,
    colorClass: 'text-stone-600',
    bgClass: 'bg-stone-100',
    borderClass: 'bg-stone-500',
    activeShadow: 'shadow-stone-200'
  }, {
    id: 'water',
    label: 'Water',
    icon: Droplets,
    colorClass: 'text-cyan-600',
    bgClass: 'bg-cyan-50',
    borderClass: 'bg-cyan-600',
    activeShadow: 'shadow-cyan-100'
  }, {
    id: 'contribute',
    label: 'Contribute',
    icon: PlusCircle,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50',
    borderClass: 'bg-purple-600',
    activeShadow: 'shadow-purple-100'
  }, {
    id: 'rewards',
    label: 'Rewards',
    icon: Star,
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
    borderClass: 'bg-yellow-500',
    activeShadow: 'shadow-yellow-100'
  }];

  const handleCheckPhone = async e => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const query = supabase.rpc('check_customer_account', { p_phone: phone });
      const { data, error } = await withTimeout(query, 8000);
      
      if (error) throw error;
      if (data && data.has_passcode) {
        setStep('login');
      } else {
        setStep('onboarding_otp');
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not verify account status. Try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWaterOrders = async phoneNumber => {
    setWaterOrdersLoading(true);
    try {
      const query = supabase.from('water_orders').select(`
          *,
          water_product:product_id (name, price),
          delivery_area:delivery_area_id (name)
        `).eq('customer_phone', phoneNumber)
          .order('created_at', { ascending: false })
          .limit(30); // Limiting to prevent massive unoptimized payloads

      const { data, error } = await withTimeout(query, 8000);
      if (error) throw error;
      setWaterOrders(data || []);
    } catch (err) {
      console.error("Error fetching water orders:", err);
      toast({ title: "Fetch Warning", description: "Failed to load recent water orders.", variant: "destructive" });
      setWaterOrders([]);
    } finally {
      setWaterOrdersLoading(false);
    }
  };

  const fetchReferralData = async (phoneNumber) => {
    setReferralsLoading(true);
    try {
      const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
      const profileQuery = supabase
        .from('profiles')
        .select('id, referral_code, wallet_balance')
        .like('phone', `%${cleanPhone}%`)
        .limit(1);

      const { data: profiles, error } = await withTimeout(profileQuery, 8000);
      if (error) throw error;

      let prof = null;
      let refCode = `CUST${cleanPhone.slice(-6)}`; 

      if (profiles && profiles.length > 0) {
        prof = profiles[0];
        if (prof.referral_code) refCode = prof.referral_code;
        setWalletBalance(prof.wallet_balance || 0);
      } else {
        setWalletBalance(0);
      }

      setReferralCode(refCode);
      setReferralLink(`${window.location.origin}/signup?ref=${refCode}`);

      if (prof && prof.id) {
          const statsRes = await withTimeout(getReferralStats(prof.id), 8000);
          const historyRes = await withTimeout(getReferralHistory(prof.id), 8000);

          if (statsRes.success && statsRes.data) {
            setTotalInvites(statsRes.data.total || 0);
            setSuccessfulReferrals(statsRes.data.successful || 0);
            setEarnings(statsRes.data.earnings || 0);
          }
          if (historyRes.success && historyRes.data) {
            setReferralHistory(historyRes.data.slice(0, 50)); // limit display logic
          }
      } else {
          setTotalInvites(0);
          setSuccessfulReferrals(0);
          setEarnings(0);
          setReferralHistory([]);
      }
    } catch (e) {
      console.error("Error fetching referral data:", e);
    } finally {
      setReferralsLoading(false);
    }
  };

  const fetchCreditNotesOnly = async (phoneNumber) => {
    try {
      const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
      const rpcQuery = supabase.rpc('get_credit_notes_by_phone', { p_phone: cleanPhone });
      const { data: notes, error: notesError } = await withTimeout(rpcQuery, 8000);

      if (!notesError && notes) {
        const validNotes = Array.isArray(notes) ? notes.map(n => ({
          ...n,
          status: n.status ? n.status.charAt(0).toUpperCase() + n.status.slice(1).toLowerCase() : 'Active'
        })) : [];
        setCreditNotes(validNotes.slice(0, 50));
      } else {
        if (notesError) console.warn("Credit note RPC failed, attempting fallback.", notesError);
        
        // Defensive limit on fallback
        const fallbackQuery = supabase
          .from('pos_credit_notes')
          .select('*')
          .ilike('customer_mobile', `%${cleanPhone}%`)
          .limit(50);
          
        const { data: directData, error: directError } = await withTimeout(fallbackQuery, 8000);
        if (!directError && directData) {
          setCreditNotes(directData.map(n => ({
            ...n,
            status: n.status ? n.status.charAt(0).toUpperCase() + n.status.slice(1).toLowerCase() : 'Active'
          })));
        } else if (directError) {
          throw directError;
        }
      }
    } catch (err) {
      console.error("[DEBUG] Failed to fetch credit notes:", err);
      // Suppress noisy toasts if it's just a background sync failure
    }
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId;
    let creditNotesChannel;

    const initData = async () => {
      if (step === 'history' && phone) {
        await fetchReferralData(phone);
        await fetchCreditNotesOnly(phone);
        
        try {
          creditNotesChannel = supabase.channel('public:pos_credit_notes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'pos_credit_notes' 
            }, () => {
                if (isMounted) fetchCreditNotesOnly(phone);
            })
            .subscribe();
        } catch (e) {
          console.warn("Realtime subscription failed:", e);
        }
          
        // Less aggressive polling to prevent Gateway timeouts from heavy DB loads
        intervalId = setInterval(() => {
          if (isMounted) fetchCreditNotesOnly(phone);
        }, 30000); 
      }
    };

    initData();

    return () => { 
      isMounted = false;
      if (creditNotesChannel) supabase.removeChannel(creditNotesChannel); 
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, phone]);

  const fetchCustomerData = async () => {
    // 1. History (Critical)
    const historyQuery = supabase.rpc('get_customer_history_via_passcode', { p_phone: phone, p_passcode: passcode });
    const { data: historyData, error: historyError } = await withTimeout(historyQuery, 12000);
    
    if (historyError) {
      if (historyError.message?.includes("Invalid Passcode")) {
        throw new Error("Invalid Passcode");
      }
      throw historyError;
    }
    // Limit to recent 100 for optimized rendering on client
    setPurchases((historyData || []).slice(0, 100));

    // Non-critical operations safely contained
    try {
      await withTimeout(supabase.rpc('update_customer_last_accessed', { p_phone: phone }), 5000);
    } catch (e) {
      console.warn("Failed to update last access time", e);
    }
    
    // 2. Pending Payments
    try {
      const creditQuery = supabase.rpc('get_customer_pending_payments', { p_phone: phone, p_passcode: passcode });
      const { data: creditRes, error: creditError } = await withTimeout(creditQuery, 8000);
      if (creditError) throw creditError;
      setCreditData(creditRes || { total_due: 0, invoices: [], payments: [] });
    } catch (e) {
      console.error("Credit fetch error:", e);
      setCreditData({ total_due: 0, invoices: [], payments: [] });
    }
    
    // 3. Credit Notes
    await fetchCreditNotesOnly(phone);

    // 4. Loyalty Points
    try {
      const loyaltyQuery = supabase.rpc('get_customer_loyalty_points', { p_phone: phone, p_passcode: passcode });
      const { data: loyaltyRes, error: loyaltyError } = await withTimeout(loyaltyQuery, 8000);
      if (loyaltyError) throw loyaltyError;
      setLoyaltyData(loyaltyRes || []);
    } catch (e) {
      console.error("Loyalty fetch error:", e);
      setLoyaltyData([]);
    }
    
    // 5. Subscriptions / Milk Profiles
    try {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      const phoneFormats = [cleanPhone, `91${cleanPhone}`, `+91${cleanPhone}`];
      const orCondition = phoneFormats.map(p => `phone.eq.${p}`).join(',');
      
      const posCustomerQuery = supabase.from('point_of_sale_customers').select('id, phone').or(orCondition).limit(20);
      const { data: posCustomers, error: posError } = await withTimeout(posCustomerQuery, 8000);
      
      if (posError) throw posError;
      
      if (posCustomers && posCustomers.length > 0) {
        const ids = posCustomers.map(c => c.id);
        const subQuery = supabase.from('milk_customer_profiles').select(`
                      *,
                      retailer:profiles!milk_customer_profiles_retailer_id_fkey(business_name, phone)
                  `).in('customer_id', ids).eq('is_active', true).limit(30);
                  
        const { data: subs, error: subError } = await withTimeout(subQuery, 8000);
        if (subError) throw subError;
        setSubscriptions(subs || []);
      } else {
        setSubscriptions([]);
      }
    } catch (subErr) {
      console.error("Unexpected error fetching subscriptions", subErr);
      setSubscriptions([]);
    }
    
    // 6. Water Orders
    await fetchWaterOrders(phone);
  };

  const handleLogin = async e => {
    e.preventDefault();
    if (passcode.length !== 4) {
      toast({ title: "Invalid Passcode", description: "Passcode must be 4 digits", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await fetchCustomerData();
      setStep('history');
      toast({ title: "Welcome Back!", description: "Access granted to purchase records." });
    } catch (err) {
      console.error(err);
      if (err.message === "Invalid Passcode") {
        toast({ title: "Incorrect Passcode", description: "Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Login Failed", description: err.message || "Failed to load dashboard data. Check connection.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWidgetSuccess = (data) => {
    setOtpToken(data);
    setStep('onboarding_passcode');
    toast({ title: "Verified", description: "Phone verified successfully. Please set your passcode." });
  };

  const handleWidgetFailure = (error) => {
    toast({ title: "Verification Failed", description: error?.message || "An error occurred during verification.", variant: "destructive" });
  };

  const handleSetupPasscode = async e => {
    e.preventDefault();
    if (passcode.length !== 4) {
      toast({ title: "Invalid Passcode", description: "Passcode must be 4 digits", variant: "destructive" });
      return;
    }
    if (passcode !== confirmPasscode) {
      toast({ title: "Mismatch", description: "Passcodes do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const query = supabase.from('customer_accounts').upsert({ phone: phone, passcode: passcode }, { onConflict: 'phone' });
      const { error } = await withTimeout(query, 8000);
        
      if (error) throw error;
      
      toast({ title: "Success!", description: "Passcode set successfully. Logging you in..." });
      await fetchCustomerData();
      setStep('history');
    } catch (err) {
      console.error(err);
      toast({ title: "Setup Failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setStep('onboarding_otp');
    setPasscode('');
    setConfirmPasscode('');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: "Code Copied", description: "Referral code copied to clipboard!" });
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy code.", variant: "destructive" });
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Join me on B2B Nexus! Use my referral code: ${referralCode} to get started and earn rewards.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Invitation to join B2B Nexus');
    const body = encodeURIComponent(`Hi there,\n\nJoin me on B2B Nexus! Use my referral code: ${referralCode} to get started and earn rewards.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || p.sale_id.toLowerCase().includes(searchLower) || (p.shop_name && p.shop_name.toLowerCase().includes(searchLower)) || p.total_amount.toString().includes(searchLower);

      let matchesDate = true;
      const purchaseDate = new Date(p.created_at);
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          matchesDate = isWithinInterval(purchaseDate, { start: startOfDay(now), end: endOfDay(now) });
          break;
        case 'yesterday':
          const yesterday = subDays(now, 1);
          matchesDate = isWithinInterval(purchaseDate, { start: startOfDay(yesterday), end: endOfDay(yesterday) });
          break;
        case 'thisWeek':
          matchesDate = isWithinInterval(purchaseDate, { start: startOfWeek(now), end: endOfWeek(now) });
          break;
        case 'lastWeek':
          const lastWeekStart = startOfWeek(subWeeks(now, 1));
          const lastWeekEnd = endOfWeek(subWeeks(now, 1));
          matchesDate = isWithinInterval(purchaseDate, { start: lastWeekStart, end: lastWeekEnd });
          break;
        case 'last30':
          matchesDate = purchaseDate >= subDays(now, 30);
          break;
        case 'last90':
          matchesDate = purchaseDate >= subDays(now, 90);
          break;
        case 'thisYear':
          matchesDate = isWithinInterval(purchaseDate, { start: startOfYear(now), end: endOfYear(now) });
          break;
        default:
          matchesDate = true;
      }
      return matchesSearch && matchesDate;
    });
  }, [purchases, searchTerm, dateFilter]);

  const toggleSale = saleId => {
    setExpandedSale(expandedSale === saleId ? null : saleId);
  };

  const totalTransactions = filteredPurchases.length;
  const totalSavings = filteredPurchases.reduce((sum, p) => sum + (Number(p.discount_amount) || 0), 0);
  const totalCoins = loyaltyData.reduce((sum, p) => sum + (Number(p.loyalty_points) || 0), 0);
  
  const totalCreditBalance = creditNotes
      .filter(n => {
        const s = (n.status || '').toLowerCase();
        return s === 'active' || s === 'generated';
      })
      .reduce((sum, n) => sum + (Number(n.amount) || 0), 0);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start py-12 px-4 sm:px-6 lg:px-8">
        
        {step !== 'history' && (
          <div className="w-full max-w-md mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg shadow-blue-500/30">
                <ShoppingBag className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Customer Portal</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Secure access to your Digital Receipts, Bills, Rewards & Many More</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {step === 'phone' && (
            <motion.div key="step-phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
              <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Welcome</CardTitle>
                  <CardDescription>Enter your mobile number to begin.</CardDescription>
                </CardHeader>
                <form onSubmit={handleCheckPhone}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mobile Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="tel" placeholder="e.g. 9876543210" className="pl-10 h-11 text-lg" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} autoFocus disabled={loading} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue"}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/')} disabled={loading}>
                      Back to Home
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          )}

          {step === 'login' && (
            <motion.div key="step-login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
              <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Enter Passcode</CardTitle>
                  <CardDescription>
                    Welcome back! Enter your 4-digit passcode for <span className="font-semibold text-slate-900 dark:text-white">+91 ******{phone.slice(-4)}</span>
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                          <label className="text-sm font-medium">Passcode</label>
                          <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-600 hover:underline" disabled={loading}>
                              Forgot Passcode?
                          </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="password" placeholder="••••" className="pl-10 h-11 text-lg tracking-widest" maxLength={4} value={passcode} onChange={e => setPasscode(e.target.value.replace(/\D/g, ''))} autoFocus disabled={loading} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><LogIn className="w-4 h-4 mr-2" /> Access Records</>}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setStep('phone');
                      setPhone('');
                      setPasscode('');
                    }} className="text-slate-500" disabled={loading}>
                      Not you? Change Number
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          )}

          {step === 'onboarding_otp' && (
            <motion.div key="step-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md">
              <Card className="shadow-xl border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle>Verify Your Identity</CardTitle>
                  <CardDescription>
                    Complete the verification process for <span className="font-semibold text-slate-900 dark:text-white">+91 ******{phone.slice(-4)}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MSG91OTPWidget 
                    phoneNumber={`91${phone}`} 
                    onSuccess={handleWidgetSuccess} 
                    onFailure={handleWidgetFailure} 
                  />
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStep('phone')} className="text-slate-500">
                    Change Phone Number
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {step === 'onboarding_passcode' && (
            <motion.div key="step-setup-passcode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md">
              <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Set Your Passcode</CardTitle>
                  <CardDescription>
                    Create a 4-digit PIN. You'll use this to log in next time securely.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSetupPasscode}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New 4-Digit Passcode</label>
                      <Input type="password" placeholder="••••" className="text-center h-12 text-2xl tracking-[0.5em]" maxLength={4} value={passcode} onChange={e => setPasscode(e.target.value.replace(/\D/g, ''))} autoFocus disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Confirm Passcode</label>
                      <Input type="password" placeholder="••••" className="text-center h-12 text-2xl tracking-[0.5em]" maxLength={4} value={confirmPasscode} onChange={e => setConfirmPasscode(e.target.value.replace(/\D/g, ''))} disabled={loading} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Login"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          )}

          {step === 'history' && (
            <motion.div key="step-history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl lg:max-w-4xl space-y-8">
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden bg-[#1E293B] text-white p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-6 items-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shrink-0 border-4 border-blue-500/30 shadow-lg relative z-10">
                  <img 
                    src="https://images.unsplash.com/photo-1490619098727-12f03f9fbd10" 
                    alt="Gift icon" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                <div className="relative z-10 flex-1 w-full text-center md:text-left">
                  <Badge className="bg-blue-500 hover:bg-blue-600 mb-3 px-3 py-1 text-white border-none mx-auto md:mx-0">Limited Offer</Badge>
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-2 leading-tight text-white">Refer Sellers, <br className="hidden md:block"/><span className="text-blue-400">Earn Rewards!</span></h2>
                  <p className="text-slate-300 text-sm md:text-base mb-5">Share your unique referral code with sellers and earn rewards when they join.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1 flex items-center border border-white/20 focus-within:ring-2 focus-within:ring-blue-500">
                      <Input value={referralCode || ''} readOnly className="bg-transparent border-none text-white font-mono focus-visible:ring-0 text-sm" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={copyToClipboard} size="sm" className="bg-white text-slate-900 hover:bg-slate-100 rounded-lg font-bold shrink-0">
                            <Copy className="w-4 h-4 mr-2" /> Copy
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy referral code</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Button 
                      className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-5 py-2 rounded-lg shadow-md border-none" 
                      onClick={shareOnWhatsApp}
                    >
                      <Share2 className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                    <Button 
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-lg shadow-md border-none" 
                      onClick={shareViaEmail}
                    >
                      <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-6">
                {referralsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-md rounded-xl overflow-hidden">
                      <CardContent className="p-5">
                        <IndianRupee className="w-6 h-6 mb-3 opacity-80" />
                        <p className="text-blue-100 text-sm font-medium">Wallet Balance</p>
                        <h3 className="text-2xl font-bold">₹{walletBalance}</h3>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm rounded-xl border-blue-100 dark:border-blue-900/30">
                      <CardContent className="p-5">
                        <Users className="w-6 h-6 mb-3 text-blue-500" />
                        <p className="text-slate-500 text-sm font-medium">Total Invites</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalInvites}</h3>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm rounded-xl border-emerald-100 dark:border-emerald-900/30">
                      <CardContent className="p-5">
                        <CheckCircle2 className="w-6 h-6 mb-3 text-emerald-500" />
                        <p className="text-slate-500 text-sm font-medium">Successful</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{successfulReferrals}</h3>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm rounded-xl border-orange-100 dark:border-orange-900/30">
                      <CardContent className="p-5">
                        <Trophy className="w-6 h-6 mb-3 text-orange-500" />
                        <p className="text-slate-500 text-sm font-medium">Earnings</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">₹{earnings}</h3>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-4">
                    <CardTitle className="text-lg">Referral History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Date Referred</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Reward</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referralsLoading ? (
                            <TableRow>
                              <TableCell colSpan={4} className="py-6">
                                <Skeleton className="h-8 w-full rounded" />
                              </TableCell>
                            </TableRow>
                          ) : referralHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                No referrals yet. Start sharing your code!
                              </TableCell>
                            </TableRow>
                          ) : (
                            referralHistory.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                  {row.referred_user_id ? `${row.referred_user_id.substring(0, 8)}...` : 'Pending User'}
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400">
                                  {formatDate(row.created_at)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn(
                                    row.status === 'successful' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30'
                                  )}>
                                    {row.status.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  {row.reward_amount > 0 ? `+₹${row.reward_amount}` : '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8 mb-2">
                  <div>
                    <Button variant="link" onClick={() => navigate('/local-shops')} className="text-blue-600 hover:text-blue-700 pl-0 pr-0">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Explore Local Shops & Search Products
                    </Button>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="text-sm text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border shadow-sm">
                            Verified: +91 ******{phone.slice(-4)}
                        </div>
                    </div>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-6 md:space-x-4 md:pb-0">
                    {tabConfig.map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                        <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={cn("relative flex flex-col items-center justify-center min-w-[85px] py-3 px-2 rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400", isActive ? cn(tab.bgClass, tab.colorClass, "font-bold", tab.activeShadow, "shadow-md") : "bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                          <tab.icon className={cn("w-6 h-6 mb-1.5 transition-transform duration-300", isActive && "scale-110")} />
                          
                          <span className="text-xs tracking-wide">{tab.label}</span>
                          
                          {isActive && <motion.div layoutId="activeTabIndicator" className={cn("absolute bottom-0 left-0 right-0 h-1 rounded-b-xl mx-4", tab.borderClass)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
                        </motion.button>
                      );
                    })}
                  </div>
              </div>

              <AnimatePresence mode="wait">
                  {activeTab === 'purchases' && (
                    <motion.div key="purchases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full">
                          <div className="flex flex-col sm:flex-row gap-2 w-full mb-6 mt-4">
                              <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input placeholder="Search shop, amount or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
                              </div>
                              <Select value={dateFilter} onValueChange={setDateFilter}>
                                  <SelectTrigger className="w-full sm:w-[150px] h-10">
                                      <SelectValue placeholder="Date Range" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="all">All Time</SelectItem>
                                      <SelectItem value="today">Today</SelectItem>
                                      <SelectItem value="yesterday">Yesterday</SelectItem>
                                      <SelectItem value="thisWeek">This Week</SelectItem>
                                      <SelectItem value="lastWeek">Last Week</SelectItem>
                                      <SelectItem value="last30">Last 30 Days</SelectItem>
                                      <SelectItem value="last90">Last 90 Days</SelectItem>
                                      <SelectItem value="thisYear">This Year</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>

                          {purchases.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                                  <CardContent className="p-4 flex flex-col justify-center">
                                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Spent</p>
                                  <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center">
                                      <IndianRupee className="w-4 h-4 mr-0.5" />{filteredPurchases.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0).toLocaleString('en-IN')}
                                  </p>
                                  </CardContent>
                              </Card>
                              
                              <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                                  <CardContent className="p-4 flex flex-col justify-center">
                                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Purchases</p>
                                  <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{totalTransactions}</p>
                                  </CardContent>
                              </Card>

                              {totalCoins > 0 && (
                                <Card className="bg-amber-50 dark:bg-amber-950/20 shadow-sm border-amber-200 dark:border-amber-800">
                                      <CardContent className="p-4 flex flex-col justify-center">
                                      <p className="text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">Total Coins</p>
                                      <p className="text-lg md:text-xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                          <Coins className="w-4 h-4" fill="currentColor" /> {totalCoins}
                                      </p>
                                      </CardContent>
                                  </Card>
                              )}

                              <Card className={totalCoins > 0 ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-sm border-green-200 dark:border-green-800 col-span-2 md:col-span-2" : "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-sm border-green-200 dark:border-green-800 col-span-2 md:col-span-2"}>
                                  <CardContent className="p-4 flex flex-row items-center justify-between">
                                  <div className="flex flex-col justify-center">
                                      <p className="text-xs text-green-700 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Total Savings</p>
                                      <p className="text-lg md:text-2xl font-extrabold text-green-700 dark:text-green-400 flex items-center">
                                          <IndianRupee className="w-5 h-5 mr-0.5" />{totalSavings.toLocaleString('en-IN')}
                                      </p>
                                  </div>
                                  <div className="bg-green-200 dark:bg-green-800 p-2 rounded-full text-green-700 dark:text-green-300">
                                      <span className="text-lg font-bold">%</span>
                                  </div>
                                  </CardContent>
                              </Card>
                            </div>
                          )}

                          {filteredPurchases.length === 0 ? (
                            <Card className="text-center py-16 bg-slate-50/50 border-dashed mt-4">
                                  <CardContent className="flex flex-col items-center">
                                      <div className="bg-white dark:bg-slate-800 p-4 rounded-full mb-4 shadow-sm">
                                          {searchTerm || dateFilter !== 'all' ? <Filter className="w-10 h-10 text-slate-400" /> : <Receipt className="w-10 h-10 text-slate-400" />}
                                      </div>
                                      <h3 className="text-lg font-semibold mb-2">
                                          {searchTerm || dateFilter !== 'all' ? "No matches found" : "No Purchases Found"}
                                      </h3>
                                      <p className="text-slate-500 max-w-sm mx-auto text-sm">
                                          {searchTerm || dateFilter !== 'all' ? "Try adjusting your filters or search terms to find what you're looking for." : "We couldn't find any receipts linked to this phone number. Make sure to provide your number at checkout next time!"}
                                      </p>
                                      {(searchTerm || dateFilter !== 'all') && <Button variant="link" onClick={() => {
                    setSearchTerm('');
                    setDateFilter('all');
                  }} className="mt-2 text-blue-600">
                                              Clear Filters
                                          </Button>}
                                  </CardContent>
                              </Card>
                          ) : (
                            <div className="space-y-4">
                                  {filteredPurchases.map(purchase => (
                                    <motion.div key={purchase.sale_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                          <div className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => toggleSale(purchase.sale_id)}>
                                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                  <div className="flex items-start gap-4">
                                                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-600 dark:text-slate-400 hidden sm:block">
                                                          <ShoppingBag className="w-6 h-6" />
                                                      </div>
                                                      <div>
                                                          <div className="flex items-center gap-2 mb-1">
                                                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-slate-500">
                                                                  #{purchase.sale_id.slice(0, 8).toUpperCase()}
                                                              </Badge>
                                                              <span className="text-xs text-slate-400">
                                                                  {new Date(purchase.created_at).toLocaleString()}
                                                              </span>
                                                          </div>
                                                          <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                                                              {purchase.shop_name || 'Unknown Shop'}
                                                          </h3>
                                                          <div className="flex items-center text-sm text-slate-500 mt-1">
                                                              <MapPin className="w-3.5 h-3.5 mr-1" />
                                                              {purchase.shop_address}
                                                          </div>
                                                      </div>
                                                  </div>

                                                  <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end gap-1 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                                                      <span className="text-xl font-bold text-slate-900 dark:text-white">
                                                          {formatPrice(purchase.total_amount)}
                                                      </span>
                                                      <div className="flex items-center gap-2">
                                                          {purchase.discount_amount > 0 && <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                                                                  Saved {formatPrice(purchase.discount_amount)}
                                                              </span>}
                                                          {expandedSale === purchase.sale_id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>

                                          <AnimatePresence>
                                              {expandedSale === purchase.sale_id && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                                                      <div className="p-4 sm:p-6 space-y-4">
                                                          <div className="space-y-3">
                                                              <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Item Details</h4>
                                                              <div className="space-y-3">
                                                                  {purchase.items && purchase.items.map((item, idx) => (
                                                                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-dashed border-slate-200 dark:border-slate-800 last:border-0">
                                                                          <div className="flex-1">
                                                                              <div className="font-medium text-slate-700 dark:text-slate-300">
                                                                                  {item.product_name}
                                                                              </div>
                                                                              <div className="text-slate-400 text-xs mt-0.5 flex gap-2">
                                                                                  <span>Qty: {item.quantity}</span>
                                                                                  <span>Rate: {formatPrice(item.unit_price)}</span>
                                                                                  {item.tax_rate > 0 && <span>GST: {item.tax_rate}%</span>}
                                                                              </div>
                                                                          </div>
                                                                          <div className="font-medium tabular-nums text-right">
                                                                              {formatPrice(item.unit_price * item.quantity)}
                                                                          </div>
                                                                      </div>
                                                                  ))}
                                                              </div>
                           </div>

                                                          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-2 text-sm border border-slate-100 dark:border-slate-800">
                                                              <div className="flex justify-between text-slate-500">
                                                                  <span>Subtotal</span>
                                                                  <span>{formatPrice(purchase.subtotal)}</span>
                                                              </div>
                                                              {purchase.tax_amount > 0 && (
                                                                <div className="flex justify-between text-slate-500">
                                                                      <span>GST (Tax)</span>
                                                                      <span>+{formatPrice(purchase.tax_amount)}</span>
                                                                  </div>
                                                              )}
                                                              {purchase.discount_amount > 0 && (
                                                                <div className="flex justify-between text-green-600 font-medium">
                                                                      <span>Discount</span>
                                                                      <span>-{formatPrice(purchase.discount_amount)}</span>
                                                                  </div>
                                                              )}
                                                              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-base">
                                                                  <span className="font-bold text-slate-900 dark:text-white">Grand Total</span>
                                                                  <span className="font-bold text-slate-900 dark:text-white">{formatPrice(purchase.total_amount)}</span>
                                                              </div>
                                                              <div className="text-xs text-slate-400 pt-1 text-right">
                                                                  Paid via {purchase.payment_method}
                                                              </div>
                                                          </div>
                                                          
                                                          <div className="flex justify-end pt-2">
                                                              <Button size="sm" variant="outline" className="text-xs">
                                                                  <Download className="w-3 h-3 mr-2" /> Download Invoice
                                                              </Button>
                                                          </div>
                                                      </div>
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>
                                      </motion.div>
                                  ))}
                              </div>
                          )}
                      </motion.div>
                  )}

                  {activeTab === 'credit' && (
                    <motion.div key="credit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full mt-4">
                          <Card className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
                              <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                  <div className="text-center md:text-left">
                                      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Total Outstanding Balance</h3>
                                      <div className="text-3xl font-extrabold text-red-700 dark:text-red-300 mt-1">
                                          {formatPrice(creditData?.total_due || 0)}
                                      </div>
                                      <p className="text-xs text-red-500/80 mt-1"> across {creditData?.invoices?.length || 0} unpaid bill(s)</p>
                                  </div>
                                  <Button className="bg-red-600 hover:bg-red-700 text-white border-none shadow-md">
                                      <CreditCard className="w-4 h-4 mr-2" /> Pay Now
                                  </Button>
                              </CardContent>
                          </Card>

                          <div className="grid gap-6 md:grid-cols-2">
                              <div className="space-y-4">
                                  <h3 className="font-semibold text-lg flex items-center gap-2">
                                      <Clock className="w-5 h-5 text-orange-500" /> Pending Bills
                                  </h3>
                                  {!creditData?.invoices || creditData.invoices.length === 0 ? (
                                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed text-slate-500">
                                          <p>No pending bills. You're all settled up!</p>
                                      </div>
                                  ) : (
                                    creditData.invoices.map(inv => (
                                      <Card key={inv.id} className="border-l-4 border-l-red-500 shadow-sm">
                                              <div className="p-4">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div>
                                                          <h4 className="font-bold text-slate-900 dark:text-white">{inv.shop_name}</h4>
                                                          <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {inv.shop_address}</p>
                                                      </div>
                                                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30">
                                                          Due: {formatPrice(inv.balance_due)}
                                                      </Badge>
                                                  </div>
                                                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                      <span>Bill Date: {new Date(inv.created_at).toLocaleDateString()}</span>
                                                      <span>Total: {formatPrice(inv.total_amount)}</span>
                                                  </div>
                                              </div>
                                          </Card>
                                    ))
                                  )}
                              </div>

                              <div className="space-y-4">
                                  <h3 className="font-semibold text-lg flex items-center gap-2">
                                      <History className="w-5 h-5 text-green-500" /> Payment History
                                  </h3>
                                  {!creditData?.payments || creditData.payments.length === 0 ? (
                                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed text-slate-500">
                                          <p>No recent credit payments found.</p>
                                      </div>
                                  ) : (
                                    creditData.payments.map(pay => (
                                      <Card key={pay.id} className="border-l-4 border-l-green-500 shadow-sm">
                                              <div className="p-4 flex justify-between items-center">
                                                  <div>
                                                      <h4 className="font-semibold text-slate-900 dark:text-white">Payment to {pay.shop_name}</h4>
                                                      <p className="text-xs text-slate-500">{new Date(pay.created_at).toLocaleDateString()} via {pay.payment_method}</p>
                                                      {pay.notes && <p className="text-xs text-slate-400 mt-1 italic">"{pay.notes}"</p>}
                                                  </div>
                                                  <div className="text-right">
                                                      <span className="font-bold text-green-600 text-lg">+{formatPrice(pay.amount)}</span>
                                                  </div>
                                              </div>
                                          </Card>
                                    ))
                                  )}
                              </div>
                          </div>
                      </motion.div>
                  )}

                  {activeTab === 'milk' && (
                    <motion.div key="milk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full space-y-6 mt-4">
                          {subscriptions.length === 0 ? (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed text-slate-500">
                                  <Milk className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                  <p>You don't have any active milk subscriptions.</p>
                                  <p className="text-xs mt-1">Contact your local dairy shop to get started!</p>
                              </div>
                          ) : (
                            subscriptions.map(sub => <MilkSubscriptionCard key={sub.id} phone={phone} subscriptionData={sub} />)
                          )}
                      </motion.div>
                  )}

                  {activeTab === 'water' && (
                    <motion.div key="water" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full space-y-6 mt-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-xl border border-cyan-100 dark:border-cyan-800">
                              <div>
                                  <h3 className="font-bold text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
                                      <Droplets className="w-5 h-5" /> Water Delivery
                                  </h3>
                                  <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-1">
                                      Order water cans quickly to your doorstep.
                                  </p>
                              </div>
                              <Button onClick={() => navigate('/water-order')} className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md w-full sm:w-auto">
                                  Place New Water Order <ArrowRight className="ml-2 w-4 h-4" />
                              </Button>
                          </div>

                          {waterOrdersLoading ? (
                            <div className="py-12 flex justify-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                              </div>
                          ) : waterOrders.length === 0 ? (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed text-slate-500">
                                  <Droplets className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                  <p>No water orders found.</p>
                                  <p className="text-xs mt-1">Place your first order now!</p>
                              </div>
                          ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                  {waterOrders.map(order => (
                                    <Card key={order.id} className="hover:shadow-md transition-shadow group overflow-hidden">
                                          <CardContent className="p-0">
                                              <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center ${order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : order.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                  <span>{order.status}</span>
                                                  <span className="normal-case font-medium opacity-80">
                                                      {new Date(order.created_at).toLocaleDateString()}
                                                  </span>
                                              </div>
                                              
                                              <div className="p-4 space-y-3">
                                                  <div className="flex justify-between items-start">
                                                      <div>
                                                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                                                              {order.water_product?.name || 'Water Can'}
                                                          </h4>
                                                          <p className="text-sm text-slate-500">
                                                              Qty: {order.quantity} × {formatPrice(order.water_product?.price || 0)}
                                                          </p>
                                                      </div>
                                                      <div className="text-right">
                                                          <span className="block text-xl font-bold text-slate-900 dark:text-white">
                                                              {formatPrice(order.total_price)}
                                                          </span>
                                                      </div>
                                                  </div>

                                                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                      <div className="flex items-center gap-1.5">
                                                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                          <span className="truncate">{order.delivery_area?.name || 'Area N/A'}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1.5 justify-end">
                                                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                                                          <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
                                                      </div>
                                                      {order.floor_number && (
                                                        <div className="col-span-2 flex items-center gap-1.5 mt-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded">
                                                              <span className="font-medium text-slate-700 dark:text-slate-300">Floor Info:</span>
                                                              <span>
                                                                  {order.floor_number === '0' ? 'Ground Floor' : `${order.floor_number} Floor`} 
                                                                  {order.lift_available ? ' (Lift Available)' : ' (No Lift)'}
                                                              </span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </CardContent>
                                      </Card>
                                  ))}
                              </div>
                          )}
                      </motion.div>
                  )}

                  {activeTab === 'contribute' && (
                    <motion.div key="contribute" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full mt-4">
                          <div className="mb-6 text-center">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contribute Products</h3>
                              <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                                  Help us build the most comprehensive product database. Add missing items or suggest edits to existing ones.
                              </p>
                          </div>
                          <ContributeProductForm />
                      </motion.div>
                  )}

                  {activeTab === 'rewards' && (
                    <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full mt-4">
                          <Card className="mb-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
                              <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                  <div className="text-center md:text-left">
                                      <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                          <Award className="w-4 h-4" /> Total Reward Coins
                                      </h3>
                                      <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 flex items-center justify-center md:justify-start gap-2">
                                          <Coins className="w-8 h-8" /> {totalCoins}
                                      </div>
                                      <p className="text-xs text-amber-600/80 mt-1">Earned from {loyaltyData.length} shops</p>
                                  </div>
                                  <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-200 max-w-xs text-center md:text-right">
                                      <Gift className="w-4 h-4 inline mb-1" /> <br />
                                      Use coins to get discounts on your next purchase at participating stores!
                                  </div>
                              </CardContent>
                          </Card>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {loyaltyData.length === 0 ? (
                                <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed text-slate-500">
                                      <Award className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                      <p>You haven't earned any coins yet.</p>
                                      <p className="text-xs mt-1">Shop at loyalty-enabled stores to start earning!</p>
                                  </div>
                              ) : (
                                loyaltyData.map(shop => (
                                  <Card key={shop.shop_id} className="hover:shadow-md transition-shadow border-amber-100 dark:border-amber-900/50">
                                          <CardContent className="p-5">
                                              <div className="flex items-start justify-between">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                          <Coins className="w-5 h-5" />
                                                      </div>
                                                      <div>
                                                          <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{shop.shop_name}</h4>
                                                          <p className="text-xs text-slate-500 line-clamp-1">{shop.shop_address}</p>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                                  <span className="text-xs text-slate-400">Balance</span>
                                                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{shop.loyalty_points}</span>
                                              </div>
                                          </CardContent>
                                      </Card>
                                ))
                              )}
                          </div>
                          
                          <div className="mt-10">
                              <Card className="mb-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
                                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="text-center md:text-left">
                                        <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 justify-center md:justify-start">
                                            <Receipt className="w-4 h-4" /> Total Credit Balance
                                        </h3>
                                        <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 flex items-center justify-center md:justify-start gap-2">
                                            <IndianRupee className="w-6 h-6" /> {totalCreditBalance.toLocaleString('en-IN')}
                                        </div>
                                        <p className="text-xs text-amber-600/80 mt-1">Available to spend</p>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-200 max-w-xs text-center md:text-right">
                                        Use your credit notes to reduce your next purchase amount.
                                    </div>
                                </CardContent>
                              </Card>

                              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Your Credit Notes</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                  {creditNotes.length === 0 ? (
                                    <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed text-slate-500">
                                          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                          <p>No active credit notes at this time.</p>
                                      </div>
                                  ) : (
                                    creditNotes.map(note => (
                                      <Card key={note.id} className="hover:shadow-md transition-shadow border-amber-100 dark:border-amber-900/50">
                                              <CardContent className="p-5">
                                                  <div className="flex items-start justify-between mb-3">
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                              <Receipt className="w-5 h-5" />
                                                          </div>
                                                          <div>
                                                              <h4 className="font-bold text-slate-900 dark:text-white font-mono text-xs">{note.id.split('-')[0].toUpperCase()}</h4>
                                                              <p className="text-xs text-slate-500">{formatDate(note.created_at)}</p>
                                                          </div>
                                                      </div>
                                                      <Badge className={['active', 'generated'].includes((note.status || '').toLowerCase()) ? 'badge-credit-active' : 'badge-credit-used'}>
                                                          {note.status || 'Active'}
                                                      </Badge>
                                                  </div>
                                                  {note.original_bill_number && (
                                                      <div className="text-xs text-slate-500 mb-2">
                                                          Ref: {note.original_bill_number}
                                                      </div>
                                                  )}
                                                  <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                                      <span className="text-xs text-slate-400">Amount</span>
                                                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatPrice(note.amount)}</span>
                                                  </div>
                                              </CardContent>
                                          </Card>
                                    ))
                                  )}
                              </div>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
      
      {/* 
        QA INSTRUCTIONS:
        1. Open the Customer Portal.
        2. Enter a valid registered phone number and complete OTP/Passcode.
        3. Verify the Dashboard loads promptly (<= 8s). 
        4. Temporarily restrict network speed (using browser devtools) to verify that queries safely timeout 
           instead of hanging indefinitely, and the user receives a graceful error state rather than a locked UI.
      */}
    </TooltipProvider>
  );
};

export default CustomerPurchaseHistory;