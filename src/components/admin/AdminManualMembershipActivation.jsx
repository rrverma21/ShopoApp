import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Search, CheckCircle, AlertCircle, Loader2, ArrowLeft, User, Shield, Calendar as CalendarIcon, Mail, Phone, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { format, addDays } from 'date-fns';

const AdminManualMembershipActivation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      searchUsers(debouncedSearchTerm);
    } else {
      setUsers([]);
    }
  }, [debouncedSearchTerm]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_yearly', { ascending: true });
    
    if (!error && data) setPlans(data);
  };

  const searchUsers = async (term) => {
    setIsSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`business_name.ilike.%${term}%,phone.ilike.%${term}%,contact_person.ilike.%${term}%,id.eq.${term.length === 36 ? term : '00000000-0000-0000-0000-000000000000'}`)
      .limit(10);
      
    if (!error && data) setUsers(data);
    setIsSearching(false);
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleConfirmClick = () => {
    if (!selectedUser) {
      toast({ title: "Validation Error", description: "Please select a user.", variant: "destructive" });
      return;
    }
    if (!selectedPlan) {
      toast({ title: "Validation Error", description: "Please select a plan.", variant: "destructive" });
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      if (user?.profile?.role !== 'admin') throw new Error("Unauthorized.");

      const duration = selectedPlan.duration_days || 365;
      const startDate = new Date(activationDate);
      const endDate = addDays(startDate, duration);
      const orderMode = selectedPlan.allowed_business_category || selectedUser.order_mode || 'Retailer';

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          membership_plan_id: selectedPlan.id,
          membership_start_date: startDate.toISOString(),
          membership_end_date: endDate.toISOString(),
          order_mode: orderMode,
          plan_activated_at: new Date().toISOString(),
          plan_activated_by: user.id,
          activation_type: 'manual'
        })
        .eq('id', selectedUser.id);
      if (profileError) throw profileError;

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          admin_id: user.id,
          user_id: selectedUser.id,
          plan_id: selectedPlan.id,
          activation_date: startDate.toISOString(),
          amount: 0,
          type: 'manual_activation',
          notes: notes
        });
      if (txError) throw txError;

      const { error: auditError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'manual_plan_activation',
          user_id: selectedUser.id,
          plan_id: selectedPlan.id,
          details: {
            activation_date: startDate.toISOString(),
            expiry_date: endDate.toISOString(),
            notes: notes,
            previous_plan_id: selectedUser.membership_plan_id
          }
        });
      if (auditError) throw auditError;

      const userEmail = selectedUser.email || `${selectedUser.phone}@placeholder.com`;
      await supabase.functions.invoke('send-membership-activation-email', {
        body: {
          email: userEmail,
          name: selectedUser.business_name || selectedUser.contact_person,
          planName: selectedPlan.name,
          features: selectedPlan.features,
          orderMode: orderMode
        }
      });

      setActivationSuccess(true);
      toast({ title: "Success", description: "Membership manually activated." });

    } catch (error) {
      console.error(error);
      toast({ title: "Activation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsActivating(false);
      setIsConfirmOpen(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedPlanId('');
    setNotes('');
    setSearchTerm('');
    setActivationDate(new Date().toISOString().split('T')[0]);
    setActivationSuccess(false);
  };

  if (user?.profile?.role !== 'admin') {
    return (
      <Card className="border-red-200 bg-red-50 my-4 shadow-sm">
        <CardContent className="p-6 flex items-center text-red-600">
          <Shield className="w-5 h-5 mr-3" />
          <strong>Unauthorized:</strong> Only administrators can access manual activation.
        </CardContent>
      </Card>
    );
  }

  if (activationSuccess) {
    return (
      <Card className="border-green-200 shadow-lg max-w-2xl mx-auto my-8 overflow-hidden">
        <div className="h-2 bg-green-500 w-full" />
        <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900">Activation Successful!</h2>
            <p className="text-slate-500 text-lg">
              The plan has been applied to the account.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl w-full text-left text-sm space-y-4 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">User Account</span>
                <p className="font-bold text-slate-800 break-all">{selectedUser?.business_name || selectedUser?.contact_person}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Assigned Plan</span>
                <p className="font-bold text-blue-600">{selectedPlan?.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Start Date</span>
                <p className="font-bold text-slate-800">{format(new Date(activationDate), 'PPP')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Expiration Date</span>
                <p className="font-bold text-red-600">{format(addDays(new Date(activationDate), selectedPlan?.duration_days || 365), 'PPP')}</p>
              </div>
            </div>
          </div>
          <Button onClick={resetForm} size="lg" className="mt-4 px-8 bg-slate-900 hover:bg-slate-800 shadow-md">
            <ArrowLeft className="w-4 h-4 mr-2" /> Activate Another Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-lg rounded-2xl bg-white overflow-hidden my-8 w-full transition-all">
      <CardHeader className="bg-slate-50/80 border-b p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
            <Wrench className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">🔧 Manual Plan Activation</CardTitle>
        </div>
        <CardDescription className="text-slate-500 text-base">
          Assign membership plans to users instantly. All activations are logged for audit purposes.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 space-y-8">
        {/* User Selection Section */}
        <div className="space-y-4">
          <Label className="text-sm font-bold text-slate-700 uppercase tracking-tight">Step 1: Identify User Account</Label>
          {!selectedUser ? (
            <div className="space-y-3 relative">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="Search by business name, email, phone number, or unique User ID..." 
                  className="pl-12 py-6 text-lg rounded-xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search user for manual activation"
                />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />}
              </div>
              
              {users.length > 0 && (
                <div className="border rounded-xl mt-2 divide-y bg-white shadow-xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 z-50">
                  {users.map(u => (
                    <div 
                      key={u.id} 
                      className="p-4 hover:bg-blue-50/50 cursor-pointer flex justify-between items-center transition-all group"
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{u.business_name || u.contact_person || 'Unnamed Entity'}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          {u.phone && <span className="flex items-center bg-slate-100 px-2 py-0.5 rounded"><Phone className="w-3 h-3 mr-1" /> {u.phone}</span>}
                          {u.email && <span className="flex items-center bg-slate-100 px-2 py-0.5 rounded"><Mail className="w-3 h-3 mr-1" /> {u.email}</span>}
                          <span className="text-[10px] font-mono text-slate-400">ID: {u.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full px-4 border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">Select</Button>
                    </div>
                  ))}
                </div>
              )}
              {searchTerm.length >= 2 && !isSearching && users.length === 0 && (
                <div className="flex items-center p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <p className="text-sm">No results found for "{searchTerm}". Please verify the details.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-sm animate-in slide-in-from-left-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-extrabold text-slate-900">{selectedUser.business_name || selectedUser.contact_person}</p>
                  <div className="text-sm text-slate-600 flex flex-wrap gap-x-4">
                    <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5 opacity-70" /> {selectedUser.phone || 'No phone'}</span>
                    <span className="opacity-50">|</span>
                    <span className="font-mono">ID: {selectedUser.id}</span>
                  </div>
                  {selectedUser.membership_plan_id && (
                    <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold mt-2 border border-orange-200">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> 
                      This user has an existing active plan
                    </div>
                  )}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg font-bold" onClick={() => setSelectedUser(null)}>Change User</Button>
            </div>
          )}
        </div>

        {/* Plan Configuration Section */}
        {selectedUser && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-6 duration-500 pt-4 border-t border-slate-100">
            <Label className="text-sm font-bold text-slate-700 uppercase tracking-tight">Step 2: Subscription Configuration</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="plan-select" className="text-slate-600 font-semibold mb-1 block">Choose Target Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger id="plan-select" className="py-6 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all text-base">
                    <SelectValue placeholder="Select a plan to assign..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl">
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id} className="py-3 focus:bg-blue-50 cursor-pointer">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold">{plan.name}</span>
                          <span className="ml-4 text-slate-400 font-mono text-xs">₹{plan.price_yearly}/yr</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-picker" className="text-slate-600 font-semibold mb-1 block">Effective Start Date</Label>
                <Input 
                  id="date-picker"
                  type="date" 
                  value={activationDate}
                  onChange={(e) => setActivationDate(e.target.value)}
                  className="py-6 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all text-base cursor-pointer"
                  required
                />
              </div>
            </div>

            {selectedPlan && (
              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="w-24 h-24 rotate-12" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xl font-black tracking-tight">{selectedPlan.name} <span className="text-blue-400 font-normal ml-2">Configuration</span></h4>
                    <span className="px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest">Selected</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Business Mode</p>
                      <p className="font-bold">{selectedPlan.allowed_business_category || 'Retailer'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Validity Period</p>
                      <p className="font-bold">{selectedPlan.duration_days || 365} Days</p>
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Value</p>
                      <p className="font-bold text-green-400">₹{selectedPlan.price_yearly} (Included)</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Unlocked Features</p>
                    <p className="text-xs text-slate-300 leading-relaxed italic">{selectedPlan.features?.join(', ') || 'Standard platform access'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-600 font-semibold mb-1 block">Reason for Manual Activation</Label>
              <Textarea 
                id="notes"
                placeholder="Describe why this activation is being performed manually (e.g., Offline payment received, Trial extension, Corporate partnership...)" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px] rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 p-4 text-slate-700 leading-relaxed shadow-sm transition-all"
              />
            </div>
          </div>
        )}
      </CardContent>
      
      {selectedUser && (
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 p-8 border-t bg-slate-50/50">
          <Button variant="outline" size="lg" className="rounded-xl px-8 py-6 border-slate-300 font-bold w-full sm:w-auto hover:bg-white" onClick={resetForm}>
            Discard Changes
          </Button>
          <Button 
            size="lg" 
            className="rounded-xl px-10 py-6 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 w-full sm:w-auto transition-all transform active:scale-95" 
            onClick={handleConfirmClick} 
            disabled={!selectedPlanId || !activationDate}
          >
            Review & Finalize
          </Button>
        </CardFooter>
      )}

      {/* Confirmation Dialog with Enhanced UI */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <AlertCircle className="w-7 h-7 text-slate-900" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-white">Ready to activate?</DialogTitle>
              <DialogDescription className="text-slate-400 text-base mt-2">
                This action will instantly update the user's subscription status and grant platform access.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Account Holder</p>
                    <p className="font-bold text-slate-900">{selectedUser?.business_name || selectedUser?.contact_person}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Plan</p>
                  <p className="font-bold text-blue-600">{selectedPlan?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm space-y-1">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Commences</p>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    {activationDate ? format(new Date(activationDate), 'MMM d, yyyy') : '---'}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm space-y-1">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Expires On</p>
                  <div className="flex items-center gap-2 font-bold text-red-600">
                    <CalendarIcon className="w-4 h-4 text-red-300" />
                    {activationDate ? format(addDays(new Date(activationDate), selectedPlan?.duration_days || 365), 'MMM d, yyyy') : '---'}
                  </div>
                </div>
              </div>

              {notes && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-1">
                  <p className="text-[10px] uppercase font-black text-amber-600 tracking-widest">Activation Notes</p>
                  <p className="text-sm text-amber-900 font-medium line-clamp-3">{notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <span>Payment Gateway Status</span>
                <span className="text-green-600">Bypassed</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 text-xl font-black text-slate-900 border-t border-slate-100 mt-2">
                <span>Total Charge</span>
                <span className="text-green-600">₹0.00</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" className="rounded-xl px-8 py-6 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 w-full sm:w-auto" onClick={() => setIsConfirmOpen(false)} disabled={isActivating}>Cancel</Button>
            <Button onClick={handleActivate} disabled={isActivating} className="rounded-xl px-10 py-6 bg-slate-900 hover:bg-black text-white font-black shadow-xl shadow-slate-900/20 w-full sm:w-auto flex-1">
              {isActivating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Shield className="w-5 h-5 mr-2 text-blue-400" />}
              Activate Membership Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminManualMembershipActivation;