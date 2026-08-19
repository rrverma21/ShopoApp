import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateGSTAmount } from '@/utils/gstCalculations';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['Rent', 'Utilities', 'Shipping', 'Marketing', 'Supplies', 'Inventory', 'Other'];
const GST_RATES = [0, 5, 12, 18, 28];
const GST_TYPES = ['None', 'IGST', 'CGST/SGST'];
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'UPI', 'Other'];

const ExpenseForm = ({ sellerId, expenseToEdit, onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    category: 'Supplies',
    description: '',
    amount: '',
    gst_rate: '0',
    gst_type: 'None',
    gst_amount: '',
    invoice_number: '',
    payment_mode: 'UPI',
  });

  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        ...expenseToEdit,
        amount: expenseToEdit.amount.toString(),
        gst_rate: expenseToEdit.gst_rate.toString(),
        gst_amount: expenseToEdit.gst_amount.toString(),
      });
    }
  }, [expenseToEdit]);

  const handleAmountChange = (e) => {
    const amt = e.target.value;
    const gstAmt = calculateGSTAmount(parseFloat(amt || 0), parseFloat(formData.gst_rate || 0));
    setFormData(prev => ({ ...prev, amount: amt, gst_amount: gstAmt.toString() }));
  };

  const handleRateChange = (rate) => {
    const gstAmt = calculateGSTAmount(parseFloat(formData.amount || 0), parseFloat(rate || 0));
    setFormData(prev => ({ ...prev, gst_rate: rate, gst_amount: gstAmt.toString(), gst_type: rate === '0' ? 'None' : (prev.gst_type === 'None' ? 'CGST/SGST' : prev.gst_type) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendor || !formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: 'Validation Error', description: 'Please fill required fields with valid amounts.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        seller_id: sellerId,
        date: formData.date,
        vendor: formData.vendor,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        gst_rate: parseFloat(formData.gst_rate),
        gst_type: formData.gst_type,
        gst_amount: parseFloat(formData.gst_amount),
        invoice_number: formData.invoice_number,
        payment_mode: formData.payment_mode,
        updated_at: new Date().toISOString()
      };

      let error;
      if (expenseToEdit) {
        const { error: err } = await supabase.from('seller_expenses').update(payload).eq('id', expenseToEdit.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('seller_expenses').insert([payload]);
        error = err;
      }

      if (error) throw error;

      toast({ title: 'Success', description: `Expense ${expenseToEdit ? 'updated' : 'added'} successfully.` });
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{expenseToEdit ? 'Edit Expense' : 'Add New Expense'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required max={new Date().toISOString().split('T')[0]} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800" />
        </div>
        <div className="space-y-2">
          <Label>Vendor / Supplier Name *</Label>
          <Input placeholder="Vendor Name" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} required className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input placeholder="INV-123" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="Expense details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
        <div className="space-y-2">
          <Label>Taxable Amount (₹) *</Label>
          <Input type="number" step="0.01" min="0" value={formData.amount} onChange={handleAmountChange} required className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 font-semibold" />
        </div>
        <div className="space-y-2">
          <Label>GST Rate (%)</Label>
          <Select value={formData.gst_rate} onValueChange={handleRateChange}>
            <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"><SelectValue placeholder="Rate" /></SelectTrigger>
            <SelectContent>
              {GST_RATES.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>GST Type</Label>
          <Select value={formData.gst_type} onValueChange={v => setFormData({...formData, gst_type: v})} disabled={formData.gst_rate === '0'}>
            <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              {GST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>GST Amount (₹)</Label>
          <Input type="number" readOnly value={formData.gst_amount} className="bg-slate-200 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Mode</Label>
          <Select value={formData.payment_mode} onValueChange={(v) => setFormData({...formData, payment_mode: v})}>
            <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"><SelectValue placeholder="Payment Mode" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 flex flex-col justify-center">
          <Label>Total Invoice Value</Label>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ₹{(parseFloat(formData.amount || 0) + parseFloat(formData.gst_amount || 0)).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {expenseToEdit ? 'Update Expense' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;