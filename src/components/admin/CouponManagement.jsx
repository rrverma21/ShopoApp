import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Percent, IndianRupee, Calendar, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateToDDMMYYYY } from '@/lib/utils';

const CouponManagement = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState(null);
    const { toast } = useToast();

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        if (error) {
            toast({ title: "Error fetching coupons", description: error.message, variant: 'destructive' });
        } else {
            setCoupons(data);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleOpenDialog = (coupon = null) => {
        const expiresDate = coupon?.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : '';
        setCurrentCoupon(coupon ? { ...coupon, expires_at: expiresDate } : { code: '', discount_type: 'percentage', discount_value: '', is_active: true, expires_at: '', usage_limit: null });
        setIsDialogOpen(true);
    };

    const handleSaveCoupon = async () => {
        const couponData = {
            ...currentCoupon,
            discount_value: parseFloat(currentCoupon.discount_value),
            expires_at: currentCoupon.expires_at ? new Date(currentCoupon.expires_at).toISOString() : null,
            usage_limit: currentCoupon.usage_limit ? parseInt(currentCoupon.usage_limit, 10) : null,
        };

        let error;
        if (couponData.id) {
            ({ error } = await supabase.from('coupons').update(couponData).eq('id', couponData.id));
        } else {
            const { id, ...insertData } = couponData;
            ({ error } = await supabase.from('coupons').insert([insertData]));
        }

        if (error) {
            toast({ title: "Save failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: `Coupon ${couponData.id ? 'updated' : 'created'} successfully.` });
            setIsDialogOpen(false);
            fetchCoupons();
        }
    };

    const handleDeleteCoupon = async (couponId) => {
        if (!window.confirm("Are you sure you want to delete this coupon?")) return;

        const { error } = await supabase.from('coupons').delete().eq('id', couponId);
        if (error) {
            toast({ title: "Delete failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: "Coupon deleted successfully." });
            fetchCoupons();
        }
    };

    const handleToggleActive = async (coupon) => {
        const { error } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
        if (error) {
            toast({ title: "Update failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Success", description: `Coupon status updated.` });
            fetchCoupons();
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <h1 className="text-3xl md:text-4xl font-bold gradient-text">Coupon Management</h1>
                <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add New Coupon
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map(coupon => (
                        <motion.div key={coupon.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={`glass-effect h-full flex flex-col ${coupon.is_active ? 'border-green-500' : 'border-red-500'}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-2xl font-mono tracking-widest">{coupon.code}</CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <Button size="icon" variant="ghost" onClick={() => handleToggleActive(coupon)}>
                                                {coupon.is_active ? <ToggleRight className="h-6 w-6 text-green-600" /> : <ToggleLeft className="h-6 w-6 text-red-600" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription className="flex items-center gap-2 text-lg font-bold">
                                        {coupon.discount_type === 'percentage' ? <Percent className="h-5 w-5 text-blue-500" /> : <IndianRupee className="h-5 w-5 text-blue-500" />}
                                        <span>{coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' OFF'}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                    {coupon.expires_at && (
                                        <div className="flex items-center text-sm text-slate-500">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            <span>Expires on: {formatDateToDDMMYYYY(coupon.expires_at)}</span>
                                        </div>
                                    )}
                                     <div className="flex items-center text-sm text-slate-500">
                                        <Users className="h-4 w-4 mr-2" />
                                        <span>
                                            Used {coupon.usage_count || 0}
                                            {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''} times
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 flex flex-col sm:flex-row justify-end gap-2 border-t mt-4">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(coupon)} className="w-full sm:w-auto"><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCoupon(coupon.id)} className="w-full sm:w-auto"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentCoupon?.id ? 'Edit' : 'Create'} Coupon</DialogTitle>
                    </DialogHeader>
                    {currentCoupon && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="code">Coupon Code</Label>
                                <Input id="code" value={currentCoupon.code} onChange={e => setCurrentCoupon({ ...currentCoupon, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="discount_type">Discount Type</Label>
                                    <Select value={currentCoupon.discount_type} onValueChange={value => setCurrentCoupon({ ...currentCoupon, discount_type: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="discount_value">Value</Label>
                                    <Input id="discount_value" type="number" value={currentCoupon.discount_value} onChange={e => setCurrentCoupon({ ...currentCoupon, discount_value: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
                                    <Input id="usage_limit" type="number" placeholder="No limit" value={currentCoupon.usage_limit || ''} onChange={e => setCurrentCoupon({ ...currentCoupon, usage_limit: e.target.value })} />
                                </div>
                                <div>
                                    <Label htmlFor="expires_at">Expires At (Optional)</Label>
                                    <Input id="expires_at" type="date" value={currentCoupon.expires_at} onChange={e => setCurrentCoupon({ ...currentCoupon, expires_at: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="is_active" checked={currentCoupon.is_active} onCheckedChange={checked => setCurrentCoupon({ ...currentCoupon, is_active: checked })} />
                                <Label htmlFor="is_active">Is Active</Label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveCoupon}>Save Coupon</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CouponManagement;