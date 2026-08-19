import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2, Loader2, List, LayoutGrid } from 'lucide-react';
import AdminManualMembershipActivation from '@/components/admin/AdminManualMembershipActivation';

const AdminMemberships = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price_yearly: '',
        free_months: 2,
        features: '',
        is_active: true,
        is_featured: false,
        max_products: 0,
        max_pos_users: 1
    });
    const { toast } = useToast();

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('membership_plans')
            .select('*')
            .order('price_yearly', { ascending: true });

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            price_yearly: plan.price_yearly || 0,
            free_months: plan.free_months !== undefined ? plan.free_months : 2,
            features: Array.isArray(plan.features) ? plan.features.join(', ') : plan.features,
            is_active: plan.is_active,
            is_featured: plan.is_featured,
            max_products: plan.max_products || 0,
            max_pos_users: plan.max_pos_users || 1
        });
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingPlan(null);
        setFormData({
            name: '',
            price_yearly: '',
            free_months: 2,
            features: '',
            is_active: true,
            is_featured: false,
            max_products: 50,
            max_pos_users: 1
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || formData.name.length < 3) {
            toast({ title: "Validation Error", description: "Plan Name must be at least 3 characters.", variant: "destructive" });
            return;
        }
        
        const yearlyPrice = parseFloat(formData.price_yearly);
        if (isNaN(yearlyPrice) || yearlyPrice <= 0) {
            toast({ title: "Validation Error", description: "Yearly Price must be greater than 0.", variant: "destructive" });
            return;
        }

        let freeMonths = parseInt(formData.free_months);
        if (isNaN(freeMonths)) {
            freeMonths = 2; 
        } else if (freeMonths < 0 || freeMonths > 12) {
             toast({ title: "Validation Error", description: "Free Months must be between 0 and 12.", variant: "destructive" });
             return;
        }

        const featuresArray = formData.features.split(',').map(f => f.trim()).filter(f => f);
        const maxProducts = parseInt(formData.max_products) || 0;
        const maxPosUsers = parseInt(formData.max_pos_users) || 0;

        if (featuresArray.length === 0 && maxProducts === 0 && maxPosUsers === 0) {
             toast({ title: "Validation Error", description: "At least one feature or limit must be defined.", variant: "destructive" });
             return;
        }
        
        const payload = {
            name: formData.name,
            price_yearly: yearlyPrice,
            free_months: freeMonths,
            features: featuresArray,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
            max_products: maxProducts,
            max_pos_users: maxPosUsers || 1,
            duration_days: 365, 
            price: yearlyPrice 
        };

        let error;
        if (editingPlan) {
            const { error: updateError } = await supabase
                .from('membership_plans')
                .update(payload)
                .eq('id', editingPlan.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('membership_plans')
                .insert([payload]);
            error = insertError;
        }

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: `Plan ${editingPlan ? 'updated' : 'created'} successfully` });
            setIsDialogOpen(false);
            fetchPlans();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        const { error } = await supabase
            .from('membership_plans')
            .delete()
            .eq('id', id);

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Plan deleted' });
            fetchPlans();
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto overflow-x-hidden">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <List className="w-8 h-8 text-blue-600" /> Memberships
                    </h1>
                    <p className="text-slate-500 text-lg">Platform-wide subscription control and direct account activation.</p>
                </div>
            </div>

            <Separator className="bg-slate-200" />

            {/* Section 1: Manual Activation (DIRECTLY & VISIBLY ABOVE) */}
            <section className="relative scroll-mt-24">
                <AdminManualMembershipActivation />
            </section>

            {/* Hierarchy Visual Separator */}
            <div className="flex items-center gap-4 py-4">
                <Separator className="flex-1 bg-slate-200" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <LayoutGrid className="w-3 h-3" /> Subscription Configuration
                </div>
                <Separator className="flex-1 bg-slate-200" />
            </div>

            {/* Section 2: Manage Subscription Plans */}
            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-slate-900">Standard Subscription Plans</h2>
                        <p className="text-sm text-slate-500">Define the pricing tiers and feature limits available to users.</p>
                    </div>
                    <Button onClick={handleCreate} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl px-6 font-bold transition-all">
                        <Plus className="w-5 h-5" /> Create New Plan
                    </Button>
                </div>

                <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-bold text-slate-700 py-5 pl-6">Plan Identity</TableHead>
                                    <TableHead className="font-bold text-slate-700 py-5">Pricing (Annual)</TableHead>
                                    <TableHead className="font-bold text-slate-700 py-5">Promo Period</TableHead>
                                    <TableHead className="font-bold text-slate-700 py-5">Access Limits</TableHead>
                                    <TableHead className="font-bold text-slate-700 py-5">Status</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 py-5 pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-48">
                                            <div className="flex flex-col justify-center items-center gap-3 text-slate-400">
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                <span className="font-medium animate-pulse">Fetching plan registry...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : plans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-48">
                                            <div className="flex flex-col justify-center items-center gap-2 text-slate-400">
                                                <List className="w-10 h-10 opacity-20" />
                                                <p className="text-lg">No subscription plans found.</p>
                                                <Button variant="link" onClick={handleCreate} className="text-blue-600 font-bold p-0">Add your first plan now</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    plans.map((plan) => (
                                        <TableRow key={plan.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <TableCell className="py-5 pl-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-base">{plan.name}</span>
                                                    {plan.is_featured && (
                                                        <span className="mt-1.5 w-fit text-[9px] uppercase font-black tracking-widest bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                                                            Popular Choice
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <span className="text-lg font-bold text-slate-900">₹{plan.price_yearly}</span>
                                                <span className="text-[10px] text-slate-400 ml-1 font-medium">/ YEAR</span>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 font-bold text-xs border border-green-100">
                                                    +{plan.free_months ?? 2} months free
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-slate-700">{plan.max_products} Product Catalog</span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">{plan.max_pos_users} Staff Accounts</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${plan.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                    <span className={`h-2 w-2 rounded-full shadow-sm ${plan.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                    {plan.is_active ? 'Active' : 'Offline'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right py-5 pr-6">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="outline" size="sm" onClick={() => handleEdit(plan)} className="h-9 w-9 p-0 rounded-xl hover:bg-blue-50 hover:text-blue-600 border-slate-200 shadow-sm">
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 shadow-sm">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </section>

            {/* Plan Modification Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                {editingPlan ? <Pencil className="w-7 h-7 text-blue-400" /> : <Plus className="w-7 h-7 text-blue-400" />}
                                {editingPlan ? 'Edit Membership Tier' : 'Craft New Subscription'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-base mt-2">
                                Configure the specific rights, costs, and benefits for this membership level.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-bold text-slate-700 uppercase tracking-widest">Plan Designation <span className="text-rose-500 font-black">*</span></Label>
                            <Input 
                                id="name" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                placeholder="e.g. Enterprise Global" 
                                className="py-6 text-lg rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                required 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label htmlFor="price_yearly" className="text-sm font-bold text-slate-700 uppercase tracking-widest">Annual Price (₹) <span className="text-rose-500 font-black">*</span></Label>
                                <Input 
                                    id="price_yearly" 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.price_yearly} 
                                    onChange={e => setFormData({...formData, price_yearly: e.target.value})} 
                                    placeholder="0.00" 
                                    className="py-6 text-lg rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 shadow-sm font-bold"
                                    required 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="free_months" className="text-sm font-bold text-slate-700 uppercase tracking-widest">Complimentary Months</Label>
                                <Input 
                                    id="free_months" 
                                    type="number"
                                    min="0"
                                    max="12"
                                    value={formData.free_months} 
                                    onChange={e => setFormData({...formData, free_months: e.target.value})} 
                                    placeholder="2" 
                                    className="py-6 text-lg rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="features" className="text-sm font-bold text-slate-700 uppercase tracking-widest">Value Proposition (Features List)</Label>
                            <textarea 
                                id="features" 
                                className="flex min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 shadow-sm transition-all resize-none"
                                value={formData.features} 
                                onChange={e => setFormData({...formData, features: e.target.value})} 
                                placeholder="Highlight 1, Feature 2, Exclusive Benefit 3..." 
                            />
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Separate multiple features with commas</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label htmlFor="max_products" className="text-sm font-bold text-slate-700 uppercase tracking-widest">Inventory Capacity</Label>
                                <Input 
                                    id="max_products" 
                                    type="number"
                                    value={formData.max_products} 
                                    onChange={e => setFormData({...formData, max_products: e.target.value})} 
                                    placeholder="500" 
                                    className="py-6 text-lg rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max_pos_users" className="text-sm font-bold text-slate-700 uppercase tracking-widest">User Threshold</Label>
                                <Input 
                                    id="max_pos_users" 
                                    type="number"
                                    value={formData.max_pos_users} 
                                    onChange={e => setFormData({...formData, max_pos_users: e.target.value})} 
                                    placeholder="5" 
                                    className="py-6 text-lg rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-10 py-6 border-y border-slate-100">
                            <div className="flex items-center gap-3">
                                <Switch 
                                    id="is_active" 
                                    checked={formData.is_active} 
                                    onCheckedChange={c => setFormData({...formData, is_active: c})} 
                                    className="data-[state=checked]:bg-blue-600 scale-125"
                                />
                                <Label htmlFor="is_active" className="text-sm font-black text-slate-900 uppercase cursor-pointer">Live Status</Label>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Switch 
                                    id="is_featured" 
                                    checked={formData.is_featured} 
                                    onCheckedChange={c => setFormData({...formData, is_featured: c})} 
                                    className="data-[state=checked]:bg-amber-500 scale-125"
                                />
                                <Label htmlFor="is_featured" className="text-sm font-black text-slate-900 uppercase cursor-pointer flex items-center gap-2">
                                    Promoted <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Featured</span>
                                </Label>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-4">
                            <Button type="button" variant="ghost" size="lg" className="rounded-2xl px-10 py-7 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex-1 sm:flex-none" onClick={() => setIsDialogOpen(false)}>
                                Abandon
                            </Button>
                            <Button type="submit" size="lg" className="bg-slate-900 hover:bg-black text-white font-black shadow-2xl shadow-slate-900/20 rounded-2xl px-12 py-7 flex-1 sm:flex-none transition-all transform active:scale-95">
                                {editingPlan ? 'Overwrite Tier' : 'Finalize Registry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminMemberships;