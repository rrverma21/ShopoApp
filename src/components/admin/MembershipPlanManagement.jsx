import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Package, Star, DollarSign, Users, Check, ShieldCheck, ShoppingBag, Store, Calculator, UserCheck, RefreshCw, BarChart3, FileText, Info, Eye, XCircle, CheckCircle, UserCog, Droplets, Loader2, Briefcase } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FEATURE_CONFIG = [
    { 
        id: 'pos', 
        label: 'Point of Sale (POS)', 
        type: 'boolean', 
        featureTag: 'Point of Sale',
        icon: Calculator,
        description: 'Enable core POS billing functionality'
    },
    { 
        id: 'pos_users', 
        label: 'No of POS Users', 
        type: 'limit', 
        column: 'max_pos_users', 
        defaultLimit: 1,
        featureTag: 'POS Users',
        icon: Users,
        description: 'Number of staff logins allowed'
    },
    { 
        id: 'employees', 
        label: 'Employee Management', 
        type: 'limit', 
        column: 'max_employees', 
        defaultLimit: 5,
        featureTag: 'Employee Management',
        icon: UserCog,
        description: 'Manage staff profiles, attendance & payroll'
    },
    { 
        id: 'products', 
        label: 'Products (No Of Products on POS)', 
        type: 'limit', 
        column: 'max_products', 
        defaultLimit: 100,
        featureTag: 'Products Inventory',
        icon: Package,
        description: 'Max items in POS inventory'
    },
    { 
        id: 'digital_shop', 
        label: 'Digital Shop (No Of Products)', 
        type: 'limit', 
        column: 'max_digital_products', 
        defaultLimit: 0,
        featureTag: 'Online Store',
        icon: Store,
        description: 'Max items in Online Store'
    },
    { 
        id: 'credit', 
        label: 'Pending/Credit Payments', 
        type: 'boolean', 
        featureTag: 'Pending/Credit Payments',
        icon: FileText,
        description: 'Track customer debts and credits'
    },
    { 
        id: 'customers', 
        label: 'Customers Management', 
        type: 'boolean', 
        featureTag: 'Customers Management',
        icon: UserCheck,
        description: 'Save and manage customer details'
    },
    { 
        id: 'smart_reorder', 
        label: 'Smart Reorder', 
        type: 'boolean', 
        featureTag: 'Smart Reorder',
        icon: RefreshCw,
        description: 'Auto-generate restock lists'
    },
    { 
        id: 'reports', 
        label: 'Sales Reports', 
        type: 'boolean', 
        featureTag: 'Sales Reports',
        icon: BarChart3,
        description: 'Access detailed sales analytics'
    },
    { 
        id: 'dior', 
        label: 'DIOR (Daily In-Out Register) + GST Register', 
        type: 'boolean', 
        featureTag: 'DIOR & GST Register',
        icon: ShoppingBag,
        description: 'Daily reports and tax filing tools'
    },
    { 
        id: 'water_order', 
        label: 'Water Order', 
        type: 'boolean', 
        featureTag: 'Water Order',
        icon: Droplets,
        description: 'Manage water jar deliveries and tracking'
    }
];

const RegistrationFeeManager = () => {
    const [fee, setFee] = useState(0);
    const [initialFee, setInitialFee] = useState(0);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRegistrationFee = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'registration_fee')
            .maybeSingle(); 
        
        if (data) {
            const feeValue = parseFloat(data.value);
            setFee(feeValue);
            setInitialFee(feeValue);
        } else if (error) {
            toast({ title: "Error", description: "Could not fetch registration fee.", variant: 'destructive' });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchRegistrationFee();
    }, [fetchRegistrationFee]);

    const handleSaveFee = async () => {
        setLoading(true);
        const { error } = await supabase
            .from('site_settings')
            .upsert({ key: 'registration_fee', value: String(fee) }, { onConflict: 'key' });
        
        if (error) {
            toast({ title: "Save Failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: "Registration fee updated successfully." });
            setInitialFee(fee);
        }
        setLoading(false);
    };

    if (loading && initialFee === 0) {
        return <div className="flex justify-center items-center h-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <Card className="mb-8 glass-effect">
            <CardHeader>
                <CardTitle className="flex items-center"><DollarSign className="mr-2 h-6 w-6" /> One-Time Registration Fee</CardTitle>
                <CardDescription>Set a one-time fee for new sellers upon registration. Set to 0 to disable.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-grow">
                        <Label htmlFor="registration-fee">Fee Amount</Label>
                        <Input
                            id="registration-fee"
                            type="number"
                            value={fee}
                            onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                            placeholder="e.g., 500"
                        />
                    </div>
                    <Button onClick={handleSaveFee} disabled={loading || fee === initialFee}>
                        {loading ? 'Saving...' : 'Save Fee'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const MembershipRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const { toast } = useToast();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('membership_payments')
            .select(`
                *,
                seller:seller_id(business_name, contact_person, phone),
                plan:plan_id(name, price_monthly, price_yearly)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setRequests(data);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleAction = async (requestId, action, sellerId) => {
        setLoading(true);
        
        try {
            const { error } = await supabase
                .from('membership_payments')
                .update({ 
                    status: action === 'approve' ? 'approved' : 'rejected',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: (await supabase.auth.getUser()).data.user.id
                })
                .eq('id', requestId);

            if (error) throw error;

            toast({ title: "Success", description: `Request ${action}d successfully.` });
            fetchRequests();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Plan Upgrade Requests</CardTitle>
                    <CardDescription>Review and approve membership payment proofs submitted by sellers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Seller</TableHead>
                                <TableHead>Requested Plan</TableHead>
                                <TableHead>Billing</TableHead>
                                <TableHead>Receipt</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">No requests found</TableCell>
                                </TableRow>
                            ) : (
                                requests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="whitespace-nowrap">{formatDate(req.created_at)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{req.seller?.business_name}</div>
                                            <div className="text-xs text-slate-500">{req.seller?.contact_person}</div>
                                            <div className="text-xs text-slate-500">{req.seller?.phone}</div>
                                        </TableCell>
                                        <TableCell className="font-semibold">{req.plan?.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-[10px]">
                                                {req.billing_cycle || 'monthly'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedImage(req.receipt_url)}>
                                                <Eye className="w-4 h-4 mr-1" /> View
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                                req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                                'bg-yellow-100 text-yellow-700'
                                            }>
                                                {req.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {req.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleAction(req.id, 'reject')}>
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(req.id, 'approve', req.seller_id)}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment Receipt</DialogTitle>
                    </DialogHeader>
                    {selectedImage && (
                        <div className="flex justify-center bg-slate-100 p-4 rounded-lg">
                            <img src={selectedImage} alt="Receipt" className="max-h-[600px] object-contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const MembershipPlanManagement = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState(null);
    const { toast } = useToast();

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('membership_plans').select('*').order('price_yearly', { ascending: true });
        if (error) {
            toast({ title: "Error fetching plans", description: error.message, variant: 'destructive' });
        } else {
            setPlans(data);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const handleOpenDialog = (plan = null) => {
        if (plan) {
            setCurrentPlan({
                ...plan,
                features: plan.features || [],
                max_digital_products: plan.max_digital_products || 0,
                max_pos_users: plan.max_pos_users || 0,
                max_employees: plan.max_employees || 0,
                price_yearly: plan.price_yearly || 0,
                free_months: plan.free_months !== undefined ? plan.free_months : 2,
                allowed_business_category: plan.allowed_business_category || 'Retailer',
            });
        } else {
            setCurrentPlan({
                name: '',
                price: 0,
                price_monthly: 0,
                price_yearly: 0,
                free_months: 2,
                duration_days: 30,
                features: [],
                is_active: true,
                max_products: 50,
                max_digital_products: 0,
                max_pos_users: 1,
                max_employees: 0,
                max_pincodes: 0,
                is_featured: false,
                allowed_business_category: 'Retailer',
            });
        }
        setIsDialogOpen(true);
    };

    const isFeatureSelected = (configItem) => {
        if (!currentPlan) return false;
        
        if (configItem.type === 'limit') {
            const val = currentPlan[configItem.column];
            return val !== undefined && val !== null && val > 0;
        }
        
        if (configItem.id === 'dior') {
             return (currentPlan.features || []).includes(configItem.featureTag) || (currentPlan.features || []).includes('DIOR');
        }

        return (currentPlan.features || []).includes(configItem.featureTag);
    };

    const handleFeatureToggle = (configItem) => {
        setCurrentPlan(prev => {
            const newState = { ...prev };
            
            if (configItem.type === 'limit') {
                const currentVal = newState[configItem.column];
                if (currentVal > 0) {
                     newState[configItem.column] = 0;
                     if (configItem.featureTag) {
                        newState.features = (newState.features || []).filter(f => f !== configItem.featureTag);
                     }
                } else {
                     newState[configItem.column] = configItem.defaultLimit || 1;
                     if (configItem.featureTag && !(newState.features || []).includes(configItem.featureTag)) {
                        newState.features = [...(newState.features || []), configItem.featureTag];
                     }
                }
            } else {
                const currentFeatures = newState.features || [];
                if (configItem.id === 'dior' && currentFeatures.includes('DIOR')) {
                     newState.features = currentFeatures.filter(f => f !== 'DIOR' && f !== configItem.featureTag);
                } else if (currentFeatures.includes(configItem.featureTag)) {
                    newState.features = currentFeatures.filter(f => f !== configItem.featureTag);
                } else {
                    newState.features = [...currentFeatures, configItem.featureTag];
                }
            }
            return newState;
        });
    };

    const handleLimitChange = (configItem, value) => {
        setCurrentPlan(prev => ({
            ...prev,
            [configItem.column]: parseInt(value, 10) || 0
        }));
    };

    const handleSavePlan = async () => {
        // Validation
        if (!currentPlan.name || currentPlan.name.length < 3) {
            toast({ title: "Validation Error", description: "Plan Name must be at least 3 characters.", variant: "destructive" });
            return;
        }

        const yearlyPrice = parseFloat(currentPlan.price_yearly);
        if (isNaN(yearlyPrice) || yearlyPrice < 0) {
             toast({ title: "Validation Error", description: "Yearly Price cannot be negative.", variant: "destructive" });
             return;
        }

        let freeMonths = parseInt(currentPlan.free_months);
        if (isNaN(freeMonths)) freeMonths = 2;
        if (freeMonths < 0 || freeMonths > 12) {
             toast({ title: "Validation Error", description: "Free Months must be between 0 and 12.", variant: "destructive" });
             return;
        }

        const finalFeatures = [...(currentPlan.features || [])];
        
        FEATURE_CONFIG.forEach(item => {
            if (item.type === 'limit' && item.featureTag) {
                 if (currentPlan[item.column] > 0) {
                     if (!finalFeatures.includes(item.featureTag)) finalFeatures.push(item.featureTag);
                 } else {
                     const idx = finalFeatures.indexOf(item.featureTag);
                     if (idx > -1) finalFeatures.splice(idx, 1);
                 }
            }
        });

        const planData = {
            ...currentPlan,
            features: [...new Set(finalFeatures)],
            price: yearlyPrice,
            price_monthly: 0,
            price_yearly: yearlyPrice,
            free_months: freeMonths,
            duration_days: 365,
            has_yearly_plan: true,
            max_products: parseInt(currentPlan.max_products, 10),
            max_digital_products: parseInt(currentPlan.max_digital_products, 10),
            max_pos_users: parseInt(currentPlan.max_pos_users, 10),
            max_employees: parseInt(currentPlan.max_employees, 10),
            max_pincodes: 0
        };

        let error;
        if (planData.id) {
            ({ error } = await supabase.from('membership_plans').update(planData).eq('id', planData.id));
        } else {
            const { id, ...insertData } = planData;
            ({ error } = await supabase.from('membership_plans').insert(insertData));
        }

        if (error) {
            toast({ title: "Save failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: `Plan ${planData.id ? 'updated' : 'created'} successfully.` });
            setIsDialogOpen(false);
            fetchPlans();
        }
    };

    const handleDeletePlan = async () => {
        if (!planToDelete) return;

        const { error } = await supabase.from('membership_plans').delete().eq('id', planToDelete.id);
        if (error) {
            toast({ title: "Delete failed", description: "This plan might be in use by sellers. " + error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: "Plan deleted successfully." });
            fetchPlans();
        }
        setDeleteAlertOpen(false);
        setPlanToDelete(null);
    };

    const handleToggleActive = async (plan) => {
        const { error } = await supabase.from('membership_plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
        if (error) {
            toast({ title: "Update failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: `Plan status updated.` });
            fetchPlans();
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-8">Seller Memberships</h1>
            
            <Tabs defaultValue="plans" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="plans">Plans Configuration</TabsTrigger>
                    <TabsTrigger value="requests">Upgrade Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-8">
                    <RegistrationFeeManager />

                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h2 className="text-2xl font-bold">Subscription Plans</h2>
                        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Add New Plan
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {plans.map(plan => (
                                <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <Card className={`glass-effect h-full flex flex-col relative overflow-hidden ${plan.is_featured ? 'border-yellow-400 border-2 shadow-lg' : ''}`}>
                                        {plan.is_featured && (
                                            <div className="absolute top-0 right-0 bg-yellow-400 text-white px-3 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1 shadow-sm">
                                                <Star className="h-3 w-3" /> Featured
                                            </div>
                                        )}
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                                                <Switch checked={plan.is_active} onCheckedChange={() => handleToggleActive(plan)} title="Toggle Active Status" />
                                            </div>
                                            <CardDescription className="flex flex-col gap-1">
                                                <div className="flex items-baseline">
                                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                        {plan.price_yearly === 0 ? 'FREE' : formatPrice(plan.price_yearly)}
                                                    </span>
                                                    {plan.price_yearly > 0 && <span className="text-sm text-slate-500 ml-1">/ year</span>}
                                                </div>
                                                <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full inline-block w-fit">
                                                    {plan.free_months ?? 2} months free
                                                </div>
                                                <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 mt-1 rounded-full inline-block w-fit">
                                                    <Briefcase className="h-3 w-3 inline mr-1" />
                                                    Category: {plan.allowed_business_category || 'Retailer'}
                                                </div>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-4 pt-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                                        <Package className="h-4 w-4 mr-2 text-blue-500" /> Products
                                                    </div>
                                                    <span className="font-bold">{plan.max_products >= 1000000 ? 'Unlimited' : plan.max_products}</span>
                                                </div>
                                                {plan.max_digital_products > 0 && (
                                                    <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                                        <div className="flex items-center text-slate-600 dark:text-slate-300">
                                                            <Store className="h-4 w-4 mr-2 text-indigo-500" /> Digital
                                                        </div>
                                                        <span className="font-bold">{plan.max_digital_products >= 1000000 ? 'Unlimited' : plan.max_digital_products}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                                        <Users className="h-4 w-4 mr-2 text-purple-500" /> POS Users
                                                    </div>
                                                    <span className="font-bold">{plan.max_pos_users || 1}</span>
                                                </div>
                                                {plan.max_employees > 0 && (
                                                    <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                                        <div className="flex items-center text-slate-600 dark:text-slate-300">
                                                            <UserCog className="h-4 w-4 mr-2 text-orange-500" /> Employees
                                                        </div>
                                                        <span className="font-bold">{plan.max_employees >= 1000000 ? 'Unlimited' : plan.max_employees}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="border-t pt-3">
                                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center">
                                                    <ShieldCheck className="h-3 w-3 mr-1"/> Features ({plan.features?.length || 0})
                                                </p>
                                                <div className="h-24 overflow-y-auto pr-2 custom-scrollbar">
                                                    <ul className="space-y-1.5">
                                                        {(plan.features || []).map((feature, i) => (
                                                            <li key={i} className="text-sm flex items-start text-slate-600 dark:text-slate-300">
                                                                <Check className="h-3.5 w-3.5 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                                                                {feature}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-4 flex flex-col sm:flex-row justify-end gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(plan)} className="w-full"><Edit className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                                            <Button variant="ghost" size="sm" onClick={() => { setPlanToDelete(plan); setDeleteAlertOpen(true); }} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="requests">
                    <MembershipRequests />
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{currentPlan?.id ? 'Edit' : 'Create'} Membership Plan</DialogTitle>
                    </DialogHeader>
                    {currentPlan && (
                        <div className="flex-1 overflow-y-auto pr-4 py-4 custom-scrollbar">
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Plan Name</Label>
                                    <Input id="name" value={currentPlan.name} onChange={e => setCurrentPlan({ ...currentPlan, name: e.target.value })} placeholder="e.g. Gold Plan" />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="allowed_business_category">Allowed Business Category (Order Mode)</Label>
                                    <Select 
                                        value={currentPlan.allowed_business_category} 
                                        onValueChange={(val) => setCurrentPlan({ ...currentPlan, allowed_business_category: val })}
                                    >
                                        <SelectTrigger id="allowed_business_category">
                                            <SelectValue placeholder="Select Business Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Retailer">Retailer</SelectItem>
                                            <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                                            <SelectItem value="Wholesale + Retail">Wholesale + Retail</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">Determines the allowed order mode for users assigned to this plan.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price_yearly">Yearly Price (₹) <span className="text-red-500">*</span></Label>
                                        <Input 
                                            id="price_yearly" 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={currentPlan.price_yearly} 
                                            onChange={e => setCurrentPlan({ ...currentPlan, price_yearly: e.target.value })} 
                                            placeholder="e.g. 5000 (or 0 for Free Trial)"
                                        />
                                        <p className="text-[11px] text-slate-500">Enter 0 for Free Trial Plans</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="free_months">Free Months</Label>
                                        <Input 
                                            id="free_months" 
                                            type="number" 
                                            min="0" 
                                            max="12"
                                            value={currentPlan.free_months} 
                                            onChange={e => setCurrentPlan({ ...currentPlan, free_months: e.target.value })} 
                                            placeholder="2"
                                        />
                                        <p className="text-[11px] text-slate-500">Free months included (0-12)</p>
                                    </div>
                                </div>
                                
                                {/* Feature Configuration */}
                                <div className="space-y-3">
                                    <Label className="text-lg font-semibold">Plan Features & Limits</Label>
                                    <ScrollArea className="h-[320px] border rounded-md p-4 bg-slate-50 dark:bg-slate-900/50">
                                        <div className="space-y-3">
                                            {FEATURE_CONFIG.map((item) => {
                                                const isSelected = isFeatureSelected(item);
                                                const ItemIcon = item.icon || Check;
                                                return (
                                                    <div key={item.id} className={`flex flex-col space-y-2 p-3 rounded border transition-colors ${isSelected ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                        <div className="flex items-center space-x-3">
                                                            <Checkbox 
                                                                id={`feature-${item.id}`} 
                                                                checked={isSelected}
                                                                onCheckedChange={() => handleFeatureToggle(item)}
                                                            />
                                                            <div className="flex items-center flex-grow cursor-pointer" onClick={() => handleFeatureToggle(item)}>
                                                                <div className={`p-1.5 rounded-full mr-3 ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                    <ItemIcon className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <Label htmlFor={`feature-${item.id}`} className="cursor-pointer font-medium text-base">
                                                                        {item.label}
                                                                    </Label>
                                                                    {item.description && (
                                                                        <span className="text-xs text-muted-foreground">{item.description}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {item.type === 'limit' && isSelected && (
                                                            <motion.div 
                                                                initial={{ height: 0, opacity: 0 }} 
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                className="pl-12 pr-2 pt-1"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Label htmlFor={`limit-${item.id}`} className="text-xs whitespace-nowrap">Max Limit:</Label>
                                                                    <Input 
                                                                        id={`limit-${item.id}`} 
                                                                        type="number" 
                                                                        className="h-8 text-sm"
                                                                        value={currentPlan[item.column] || 0}
                                                                        onChange={(e) => handleLimitChange(item, e.target.value)}
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                    <p className="text-xs text-muted-foreground">Select features to include. For limits (Products, Users, etc.), set the maximum allowed count.</p>
                                </div>

                                <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 mt-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch id="is_active" checked={currentPlan.is_active} onCheckedChange={checked => setCurrentPlan({ ...currentPlan, is_active: checked })} />
                                        <Label htmlFor="is_active" className="cursor-pointer">Active Plan</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch id="is_featured" checked={currentPlan.is_featured} onCheckedChange={checked => setCurrentPlan({ ...currentPlan, is_featured: checked })} />
                                        <Label htmlFor="is_featured" className="cursor-pointer">Featured (Recommended)</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-4 pt-2 border-t">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSavePlan}>Save Plan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the <strong>{planToDelete?.name}</strong> plan? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePlan} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MembershipPlanManagement;