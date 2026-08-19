import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AddSaleForm = ({ onSuccess, saleData }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        sale_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        pre_tax_amount: 0,
        total_tax_amount: 0,
    });

    const finalAmount = useMemo(() => {
        const preTax = parseFloat(formData.pre_tax_amount) || 0;
        const tax = parseFloat(formData.total_tax_amount) || 0;
        return (preTax + tax).toFixed(2);
    }, [formData.pre_tax_amount, formData.total_tax_amount]);

    useEffect(() => {
        if (saleData) {
            setFormData({
                sale_date: new Date(saleData.sale_date).toISOString().split('T')[0],
                invoice_number: saleData.invoice_no || '',
                pre_tax_amount: saleData.taxable_value || 0,
                total_tax_amount: (saleData.cgst_amount || 0) + (saleData.sgst_amount || 0) + (saleData.igst_amount || 0),
            });
        }
    }, [saleData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
            return;
        }
        setLoading(true);

        // This is a simplified submission. For full GST compliance, we'd need to break down the tax.
        // The GstForm component is the more detailed version. This form is legacy.
        const salePayload = {
            user_id: user.id,
            sale_date: formData.sale_date,
            invoice_no: formData.invoice_number,
            taxable_value: parseFloat(formData.pre_tax_amount),
            total_value: parseFloat(finalAmount),
             // Assuming a simple tax structure for this form
            gst_rate: 18, // Example default
            cgst_amount: parseFloat(formData.total_tax_amount) / 2,
            sgst_amount: parseFloat(formData.total_tax_amount) / 2,
            igst_amount: 0,
        };

        try {
            const { error } = saleData
                ? await supabase.from('dior_sales').update(salePayload).eq('id', saleData.id)
                : await supabase.from('dior_sales').insert(salePayload);

            if (error) throw error;
            toast({
                title: `Sale ${saleData ? 'Updated' : 'Added'}`,
                description: `The sale record has been successfully ${saleData ? 'updated' : 'saved'}.`,
            });
            onSuccess();
        } catch (error) {
            toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="sale_date">Sale Date</Label>
                    <Input id="sale_date" name="sale_date" type="date" value={formData.sale_date} onChange={handleChange} required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                    <Label htmlFor="invoice_number">Invoice Number</Label>
                    <Input id="invoice_number" name="invoice_number" placeholder="e.g., INV-2024-001" value={formData.invoice_number} onChange={handleChange} className="bg-gray-700 border-gray-600" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="pre_tax_amount">Pre-Tax Amount (₹)</Label>
                    <Input id="pre_tax_amount" name="pre_tax_amount" type="number" step="0.01" min="0" value={formData.pre_tax_amount} onChange={handleChange} required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                    <Label htmlFor="total_tax_amount">Total Tax (₹)</Label>
                    <Input id="total_tax_amount" name="total_tax_amount" type="number" step="0.01" min="0" value={formData.total_tax_amount} onChange={handleChange} required className="bg-gray-700 border-gray-600" />
                </div>
                <div>
                    <Label>Final Amount</Label>
                    <div className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm">
                        ₹{finalAmount}
                    </div>
                </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
                {loading ? (saleData ? 'Updating...' : 'Adding...') : (saleData ? 'Update Sale' : 'Add Sale')}
            </Button>
        </form>
    );
};

export default AddSaleForm;