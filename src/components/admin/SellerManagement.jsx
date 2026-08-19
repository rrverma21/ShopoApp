import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
// ... imports
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserX, UserCheck, Mail, Phone, MapPin, Edit, Eye, Check, X, ShieldCheck, ShieldAlert, Copy, Star, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDateToDDMMYYYY } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SellerManagement = () => {
  const [sellers, setSellers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const fetchSellersAndPending = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: allSellerUsers, error: rpcError } = await supabase.rpc('get_all_sellers');
      if (rpcError) throw rpcError;
      
      const allSellerIds = allSellerUsers.map(s => s.id);

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, membership_plan_id, membership_end_date, phone_verified, display_id, is_featured, registration_fee_paid, plan:membership_plan_id(name)')
        .in('id', allSellerIds);
      if (profileError) throw profileError;

      const { data: payments, error: paymentError } = await supabase
        .from('membership_payments')
        .select('*, plan:plan_id(name, is_featured)')
        .in('seller_id', allSellerIds)
        .in('status', ['pending', 'pending_registration_fee']);
      if (paymentError) throw paymentError;
      
      const combinedSellers = allSellerUsers.map(sellerUser => {
        const profile = profiles.find(p => p.id === sellerUser.id) || {};
        const pendingUpgrade = payments.find(p => p.seller_id === sellerUser.id && p.status === 'pending');
        return { ...sellerUser, ...profile, pendingPayment: pendingUpgrade };
      });

      const approvedSellers = combinedSellers.filter(s => s.registration_fee_paid);
      
      const pendingRegSellers = payments
        .filter(p => p.status === 'pending_registration_fee')
        .map(payment => {
            const sellerInfo = combinedSellers.find(s => s.id === payment.seller_id);
            return { ...sellerInfo, pendingRegistrationPayment: payment };
        });

      setSellers(approvedSellers);
      setPendingRegistrations(pendingRegSellers);

    } catch (error) {
      toast({ title: "Error fetching data", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFilteredSellers(
      sellers.filter(s =>
        (s.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.display_id || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, sellers]);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase.from('membership_plans').select('*').eq('is_active', true);
    if (error) {
      toast({ title: "Error fetching plans", description: error.message, variant: 'destructive' });
    } else {
      setMembershipPlans(data);
    }
  }, []);

  useEffect(() => {
    fetchSellersAndPending();
    fetchPlans();
  }, [fetchSellersAndPending, fetchPlans]);

  const toggleSellerStatus = async (sellerId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this seller?`)) return;

    try {
      const { error } = await supabase.from('profiles').update({ is_disabled: newStatus }).eq('id', sellerId);
      if (error) throw error;
      toast({ title: `Seller ${newStatus ? 'Disabled' : 'Enabled'}`, description: `The seller account has been successfully ${newStatus ? 'disabled' : 'enabled'}.` });
      fetchSellersAndPending();
    } catch (error) {
      toast({ title: "Update Failed", description: error.message, variant: 'destructive' });
    }
  };

  const handleOpenPlanDialog = (seller) => {
    setSelectedSeller(seller);
    setSelectedPlanId(seller.membership_plan_id || '');
    setIsPlanDialogOpen(true);
  };

  const handleAssignPlan = async () => {
    if (!selectedSeller || !selectedPlanId) return;
    const plan = membershipPlans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration_days);

    const { error } = await supabase.from('profiles').update({
      membership_plan_id: plan.id,
      membership_start_date: startDate.toISOString(),
      membership_end_date: endDate.toISOString(),
      is_featured: plan.is_featured,
    }).eq('id', selectedSeller.id);

    if (error) {
      toast({ title: "Failed to assign plan", description: error.message, variant: 'destructive' });
    } else {
      toast({ title: "Plan Assigned!", description: `${plan.name} has been assigned to ${selectedSeller.business_name}.` });
      setIsPlanDialogOpen(false);
      fetchSellersAndPending();
    }
  };

  const handleOpenReceiptDialog = (payment, sellerInfo) => {
    setSelectedPayment(payment);
    setSelectedSeller(sellerInfo);
    setIsReceiptDialogOpen(true);
  };

    const handlePaymentReview = async (payment, newStatus) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error: paymentUpdateError } = await supabase.from('membership_payments').update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
        }).eq('id', payment.id);

        if (paymentUpdateError) {
            toast({ title: "Payment Update Failed", description: paymentUpdateError.message, variant: 'destructive' });
            return;
        }

        if (newStatus === 'approved' && payment.status === 'pending') {
            const plan = membershipPlans.find(p => p.id === payment.plan_id);
            if (plan) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(startDate.getDate() + plan.duration_days);
                const { error: profileError } = await supabase.from('profiles').update({
                    membership_plan_id: plan.id,
                    membership_start_date: startDate.toISOString(),
                    membership_end_date: endDate.toISOString(),
                    is_featured: plan.is_featured,
                }).eq('id', payment.seller_id);

                if (profileError) {
                    toast({ title: "Profile Update Failed", description: profileError.message, variant: 'destructive' });
                    return;
                }
            }
        }

        if (newStatus === 'approved' && payment.status === 'pending_registration_fee') {
            const { error: profileError } = await supabase.from('profiles').update({
                registration_fee_paid: true,
            }).eq('id', payment.seller_id);

            if (profileError) {
                toast({ title: "Profile Activation Failed", description: profileError.message, variant: 'destructive' });
                return;
            }
        }

        toast({ title: "Success", description: `Payment has been ${newStatus}.` });
        setIsReceiptDialogOpen(false);
        fetchSellersAndPending();
    };

  const toggleFeaturedStatus = async (seller) => {
    const newFeaturedStatus = !seller.is_featured;
    const { error } = await supabase.from('profiles').update({ is_featured: newFeaturedStatus }).eq('id', seller.id);
    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: 'destructive' });
    } else {
      toast({ title: "Success", description: `${seller.business_name} is ${newFeaturedStatus ? 'now featured' : 'no longer featured'}.` });
      fetchSellersAndPending();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard.` });
  };

    const renderSellerCard = (seller) => (
      <motion.div key={seller.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={`glass-effect h-full flex flex-col ${seller.is_disabled ? 'opacity-60 bg-red-50' : ''} ${seller.is_featured ? 'border-yellow-400 border-2' : ''}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="flex items-center gap-2">
                {seller.business_name}
                {seller.is_featured && <Star className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${seller.is_disabled ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                {seller.is_disabled ? 'Disabled' : 'Active'}
              </span>
            </div>
            <p className="text-sm text-slate-500">{seller.contact_person}</p>
          </CardHeader>
          <CardContent className="space-y-3 flex-grow flex flex-col">
            {seller.display_id && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>ID: {seller.display_id}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(seller.display_id)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-slate-500 flex-shrink-0" /> {seller.email}</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" /> 
                <span>{seller.phone}</span>
                {seller.phone_verified ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" title="Phone Verified" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-yellow-600" title="Phone Unverified" />
                )}
              </div>
              <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-slate-500 mt-1 flex-shrink-0" /> <span>{seller.street_address}, {seller.city}, {seller.pincode}</span></p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">MEMBERSHIP</p>
              <p className="font-bold text-blue-600">{seller.plan?.name || 'No Plan'}</p>
              {seller.membership_end_date && <p className="text-xs text-slate-500">Expires: {formatDateToDDMMYYYY(seller.membership_end_date)}</p>}
              {seller.pendingPayment && (
                <div className="mt-2 p-2 bg-yellow-100 rounded-md">
                  <p className="text-xs text-yellow-800 font-semibold">Pending Upgrade: {seller.pendingPayment.plan.name} {seller.pendingPayment.plan.is_featured && '(Featured)'}</p>
                  <Button variant="link" className="h-auto p-0 text-xs text-yellow-900" onClick={() => handleOpenReceiptDialog(seller.pendingPayment, seller)}>
                    View Receipt
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenPlanDialog(seller)}><Edit className="h-4 w-4 mr-2" /> Manage Plan</Button>
              <Button variant={seller.is_disabled ? 'default' : 'destructive'} size="sm" className="w-full" onClick={() => toggleSellerStatus(seller.id, seller.is_disabled)}>
                {seller.is_disabled ? <UserCheck className="h-4 w-4 mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
                {seller.is_disabled ? 'Enable' : 'Disable'}
              </Button>
            </div>
            <div className="flex items-center space-x-2 mt-2 pt-2 border-t">
              <Switch id={`featured-${seller.id}`} checked={!!seller.is_featured} onCheckedChange={() => toggleFeaturedStatus(seller)} />
              <Label htmlFor={`featured-${seller.id}`}>Featured Seller</Label>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );

    const renderPendingRegistrationCard = (seller) => (
      <motion.div key={seller.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-effect h-full flex flex-col bg-amber-50 border-amber-300">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">{seller.business_name}</CardTitle>
            <p className="text-sm text-slate-500">{seller.contact_person}</p>
          </CardHeader>
          <CardContent className="space-y-3 flex-grow flex flex-col">
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 text-slate-500 flex-shrink-0" /> {seller.email}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" />{seller.phone}</p>
            </div>
            <div className="mt-auto pt-4">
              <p className="text-sm font-semibold text-amber-800">Registration fee payment pending approval.</p>
              <p className="text-xs text-slate-500">Submitted on: {formatDateToDDMMYYYY(seller.pendingRegistrationPayment.created_at)}</p>
              <Button 
                className="w-full mt-4" 
                onClick={() => handleOpenReceiptDialog(seller.pendingRegistrationPayment, seller)}
              >
                Review Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Seller Management</h1>
        <p className="text-slate-600 text-base md:text-lg">View, approve, and manage registered sellers.</p>
      </motion.div>

      <Tabs defaultValue="active-sellers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active-sellers">Active Sellers ({sellers.length})</TabsTrigger>
            <TabsTrigger value="pending-registrations">Pending Registrations ({pendingRegistrations.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active-sellers">
            <Card className="glass-effect my-6 p-4">
                <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Search by business name, contact, or seller ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                </div>
            </Card>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSellers.map(renderSellerCard)}
                {filteredSellers.length === 0 && <div className="col-span-full text-center py-16 text-slate-500"><p>No active sellers found.</p></div>}
            </div>
        </TabsContent>
        <TabsContent value="pending-registrations">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {pendingRegistrations.map(renderPendingRegistrationCard)}
                {pendingRegistrations.length === 0 && <div className="col-span-full text-center py-16 text-slate-500"><p>No pending registrations.</p></div>}
            </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Membership for {selectedSeller?.business_name}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="membership-plan">Select a Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="membership-plan"><SelectValue placeholder="Select a membership plan" /></SelectTrigger>
              <SelectContent>{membershipPlans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name} {plan.is_featured && '⭐'}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignPlan}>Assign Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="max-w-md md:max-w-xl lg:max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader><DialogTitle>Review Payment</DialogTitle></DialogHeader>
          {selectedPayment && (
            <div className="py-4 space-y-4 overflow-y-auto flex-grow">
              <p><strong>Seller:</strong> {selectedSeller?.business_name}</p>
              {selectedPayment.status === 'pending' && <p><strong>Plan Upgrade:</strong> {selectedPayment.plan?.name} {selectedPayment.plan?.is_featured && '(Featured)'}</p>}
              {selectedPayment.status === 'pending_registration_fee' && <p><strong>Type:</strong> One-Time Registration Fee</p>}
              <p><strong>Date:</strong> {formatDateToDDMMYYYY(selectedPayment.created_at)}</p>
              <div>
                <p className="font-semibold mb-2">Payment Receipt:</p>
                <img src={selectedPayment.receipt_url} alt="Payment Receipt" className="rounded-md border w-full h-auto object-contain" />
              </div>
            </div>
          )}
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Close</Button>
            <Button variant="destructive" onClick={() => handlePaymentReview(selectedPayment, 'rejected')}><X className="mr-2 h-4 w-4" /> Reject</Button>
            <Button onClick={() => handlePaymentReview(selectedPayment, 'approved')}><Check className="mr-2 h-4 w-4" /> Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerManagement;