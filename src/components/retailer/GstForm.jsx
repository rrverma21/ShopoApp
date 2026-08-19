import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { INDIAN_STATES_DATA as INDIAN_STATES } from '@/lib/indianStates';

const GST_RATES = [0, 3, 5, 12, 18, 28];

const GstForm = ({ type, itemData, onSuccess }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const isSales = type === 'sales';

    const getInitialState = useCallback(() => {
        const base = {
            date: new Date().toISOString().split('T')[0],
            taxable_value: 0,
            gst_rate: '18',
            place_of_supply: 'Maharashtra', // Default
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: 0,
            total_value: 0,
            payment_mode: 'Cash',
        };
        if (isSales) {
            return {
                ...base,
                invoice_no: '', customer_name: '', customer_gstin: '', hsn_code: '',
            };
        }
        return {
            ...base,
            bill_no: '', vendor_name: '', vendor_gstin: '', expense_type: 'Goods', eligible_for_itc: true,
        };
    }, [isSales]);

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if (itemData) {
            const data = {
                date: new Date(isSales ? itemData.sale_date : itemData.expense_date).toISOString().split('T')[0],
                taxable_value: itemData.taxable_value || 0,
                gst_rate: String(itemData.gst_rate || 18),
                place_of_supply: itemData.place_of_supply || 'Maharashtra',
                payment_mode: itemData.payment_mode || 'Cash',
            };
            if (isSales) {
                Object.assign(data, {
                    invoice_no: itemData.isCopy ? '' : itemData.invoice_no || '',
                    customer_name: itemData.customer_name || '',
                    customer_gstin: itemData.customer_gstin || '',
                    hsn_code: itemData.hsn_code || '',
                });
            } else {
                 Object.assign(data, {
                    bill_no: itemData.isCopy ? '' : itemData.bill_no || '',
                    vendor_name: itemData.vendor_name || '',
                    vendor_gstin: itemData.vendor_gstin || '',
                    expense_type: itemData.expense_type || 'Goods',
                    eligible_for_itc: itemData.eligible_for_itc !== false,
                });
            }
            setFormData(prev => ({...prev, ...data}));
        } else {
            setFormData(getInitialState());
        }
    }, [itemData, isSales, getInitialState]);


    useEffect(() => {
        const taxable = parseFloat(formData.taxable_value) || 0;
        const rate = parseFloat(formData.gst_rate) / 100;
        const isIntraState = formData.place_of_supply === 'Maharashtra'; // Assuming user's state is MH

        let cgst = 0, sgst = 0, igst = 0;
        if (isIntraState) {
            cgst = taxable * (rate / 2);
            sgst = taxable * (rate / 2);
        } else {
            igst = taxable * rate;
        }
        
        const total = taxable + cgst + sgst + igst;

        setFormData(prev => ({
            ...prev,
            cgst_amount: cgst.toFixed(2),
            sgst_amount: sgst.toFixed(2),
            igst_amount: igst.toFixed(2),
            total_value: total.toFixed(2),
        }));

    }, [formData.taxable_value, formData.gst_rate, formData.place_of_supply]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateGSTIN = (gstin) => {
        if (!gstin) return true; // Optional field
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(gstin);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const gstinField = isSales ? 'customer_gstin' : 'vendor_gstin';
        if (!validateGSTIN(formData[gstinField])) {
            toast({ title: "Invalid GSTIN format", variant: "destructive" });
            return;
        }
        
        setLoading(true);

        const payload = {
            user_id: user.id,
            taxable_value: parseFloat(formData.taxable_value),
            gst_rate: parseFloat(formData.gst_rate),
            place_of_supply: formData.place_of_supply,
            cgst_amount: parseFloat(formData.cgst_amount),
            sgst_amount: parseFloat(formData.sgst_amount),
            igst_amount: parseFloat(formData.igst_amount),
            total_value: parseFloat(formData.total_value),
            payment_mode: formData.payment_mode,
        };

        if (isSales) {
            Object.assign(payload, {
                sale_date: formData.date,
                invoice_no: formData.invoice_no,
                customer_name: formData.customer_name,
                customer_gstin: formData.customer_gstin,
                hsn_code: formData.hsn_code,
            });
        } else {
            Object.assign(payload, {
                expense_date: formData.date,
                bill_no: formData.bill_no,
                vendor_name: formData.vendor_name,
                vendor_gstin: formData.vendor_gstin,
                expense_type: formData.expense_type,
                eligible_for_itc: formData.eligible_for_itc,
            });
        }

        const table = isSales ? 'dior_sales' : 'dior_expenses';
        const isEditing = itemData && !itemData.isCopy;
        
        try {
            const { error } = isEditing
                ? await supabase.from(table).update(payload).eq('id', itemData.id)
                : await supabase.from(table).insert(payload);

            if (error) throw error;
            toast({ title: `Success`, description: `Entry ${isEditing ? 'updated' : 'saved'}.` });
            onSuccess();
        } catch (error) {
            toast({ title: "Save failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1 sm:pr-4">
            {/* Common Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <Label>Date</Label>
                    <Input name="date" type="date" value={formData.date} onChange={handleChange} required />
                </div>
                {isSales ? (
                     <div>
                        <Label>Invoice No.</Label>
                        <Input name="invoice_no" value={formData.invoice_no} onChange={handleChange} required />
                    </div>
                ) : (
                     <div>
                        <Label>Bill No.</Label>
                        <Input name="bill_no" value={formData.bill_no} onChange={handleChange} required />
                    </div>
                )}
                 <div>
                    <Label>Place of Supply</Label>
                    <Select name="place_of_supply" value={formData.place_of_supply} onValueChange={(v) => handleSelectChange('place_of_supply', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            {INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Party Details */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>{isSales ? 'Customer' : 'Vendor'} Name</Label>
                    <Input name={isSales ? "customer_name" : "vendor_name"} value={isSales ? formData.customer_name : formData.vendor_name} onChange={handleChange} required />
                </div>
                <div>
                    <Label>GSTIN (Optional)</Label>
                    <Input name={isSales ? "customer_gstin" : "vendor_gstin"} value={isSales ? formData.customer_gstin : formData.vendor_gstin} onChange={handleChange} className="uppercase" />
                </div>
            </div>
            
            {/* Item/Expense Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isSales ? (
                    <div>
                        <Label>HSN/SAC Code (Optional)</Label>
                        <Input name="hsn_code" value={formData.hsn_code} onChange={handleChange} />
                    </div>
                ) : (
                    <div>
                        <Label>Expense Type</Label>
                        <Input name="expense_type" value={formData.expense_type} onChange={handleChange} />
                    </div>
                )}
                 <div>
                    <Label>Payment Mode</Label>
                    <Select name="payment_mode" value={formData.payment_mode} onValueChange={(v) => handleSelectChange('payment_mode', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tax Calculation Area */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label>Taxable Value (₹)</Label>
                        <Input name="taxable_value" type="number" step="0.01" min="0" value={formData.taxable_value} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label>GST Rate (%)</Label>
                        <Select name="gst_rate" value={formData.gst_rate} onValueChange={(v) => handleSelectChange('gst_rate', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <Label>CGST (₹)</Label>
                        <div className="font-mono p-2 bg-background rounded h-10 flex items-center text-sm">₹{formData.cgst_amount}</div>
                    </div>
                     <div>
                        <Label>SGST (₹)</Label>
                        <div className="font-mono p-2 bg-background rounded h-10 flex items-center text-sm">₹{formData.sgst_amount}</div>
                    </div>
                     <div>
                        <Label>IGST (₹)</Label>
                        <div className="font-mono p-2 bg-background rounded h-10 flex items-center text-sm">₹{formData.igst_amount}</div>
                    </div>
                     <div>
                        <Label>Total Value (₹)</Label>
                        <div className="font-mono p-2 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded h-10 flex items-center font-bold text-sm">₹{formData.total_value}</div>
                    </div>
                </div>
            </div>

            {!isSales && (
                <div className="flex items-center space-x-2">
                    <Checkbox id="itc" name="eligible_for_itc" checked={formData.eligible_for_itc} onCheckedChange={(c) => handleSelectChange('eligible_for_itc', c)} />
                    <Label htmlFor="itc">Eligible for Input Tax Credit (ITC)</Label>
                </div>
            )}
            
            <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : (itemData && !itemData.isCopy ? 'Update' : 'Save')}
            </Button>
        </form>
    );
};

export default GstForm;