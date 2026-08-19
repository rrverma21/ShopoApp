import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { INDIAN_STATES_DATA } from '@/lib/indianStates';

const UpdateBillForm = ({ bill, categories, onBillUpdated, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      ...bill,
      due_date: bill.due_date ? new Date(bill.due_date) : null,
      paid_date: bill.paid_date ? new Date(bill.paid_date) : new Date(),
    }
  });

  const status = watch('status');
  const dueDate = watch('due_date');
  const paidDate = watch('paid_date');
  const [receiptFile, setReceiptFile] = useState(null);
  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra');
  const [eligibleForItc, setEligibleForItc] = useState(true);


  useEffect(() => {
    if (status === 'unpaid') {
      setValue('payment_method', null);
      setValue('paid_date', null);
    } else {
        if (!paidDate) {
            setValue('paid_date', new Date());
        }
    }
  }, [status, setValue, paidDate]);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const createOrUpdateGstExpense = async (billData) => {
    const expenseData = {
      user_id: user.id,
      bill_id: billData.id,
      expense_date: billData.paid_date,
      bill_no: billData.bill_number,
      vendor_name: billData.supplier_name,
      vendor_gstin: billData.supplier_gstin,
      expense_type: billData.category?.name || 'General',
      taxable_value: billData.taxable_value,
      gst_rate: 0, // GST is handled in slabs below
      cgst_amount: ((billData.gst_5_amount/2) + (billData.gst_12_amount/2) + (billData.gst_18_amount/2) + (billData.gst_28_amount/2)),
      sgst_amount: ((billData.gst_5_amount/2) + (billData.gst_12_amount/2) + (billData.gst_18_amount/2) + (billData.gst_28_amount/2)),
      igst_amount: 0, // Assuming intra-state for now. Can be enhanced later.
      total_value: billData.amount,
      payment_mode: billData.payment_method,
      eligible_for_itc: eligibleForItc,
      place_of_supply: placeOfSupply,
    };
  
    // Check if an expense for this bill already exists
    const { data: existingExpense, error: fetchError } = await supabase
      .from('dior_expenses')
      .select('id')
      .eq('bill_id', billData.id)
      .maybeSingle();
  
    if (fetchError) {
      throw fetchError;
    }
  
    if (existingExpense) {
      // Update existing expense
      const { error: updateError } = await supabase.from('dior_expenses').update(expenseData).eq('id', existingExpense.id);
      if (updateError) throw updateError;
      toast({ title: 'GST Expense Updated', description: 'The corresponding entry in the GST register has been updated.' });
    } else {
      // Create new expense
      const { error: insertError } = await supabase.from('dior_expenses').insert(expenseData);
      if (insertError) throw insertError;
      toast({ title: 'Bill Transferred to GST Expenses', description: 'A new entry has been created in the GST register.' });
    }
  };

  const onSubmit = async (formData) => {
    try {
      let receipt_url = bill.receipt_url;

      if (receiptFile) {
        if (bill.receipt_url) {
          const oldFilePath = bill.receipt_url.split('/').slice(-2).join('/');
          await supabase.storage.from('dior-receipts').remove([oldFilePath]);
        }
        const filePath = `${user.id}/${Date.now()}_${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage.from('dior-receipts').upload(filePath, receiptFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('dior-receipts').getPublicUrl(filePath);
        receipt_url = urlData.publicUrl;
      }
      
      const updateData = {
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        paid_date: formData.status === 'paid' && formData.paid_date ? format(formData.paid_date, 'yyyy-MM-dd') : null,
        payment_method: formData.status === 'paid' ? formData.payment_method : null,
        receipt_url,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedBill, error } = await supabase.from('dior_bills').update(updateData).eq('id', bill.id).select().single();
      if (error) throw error;
      
      if (updatedBill.status === 'paid') {
        await createOrUpdateGstExpense(updatedBill);
      }

      toast({ title: 'Bill updated successfully!' });
      onBillUpdated();
    } catch (error) {
      toast({ title: 'Error updating bill', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register('amount', { required: 'Amount is required' })} />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
               <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dueDate} onSelect={(date) => setValue('due_date', date)} initialFocus />
            </PopoverContent>
          </Popover>
          <input type="hidden" {...register('due_date', { required: 'Due date is required' })} />
        </div>
      </div>
      
      <div>
        <Label htmlFor="category_id">Category</Label>
        <Select onValueChange={(value) => setValue('category_id', value)} defaultValue={bill.category_id}>
            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="supplier_name">Supplier Name</Label>
        <Input id="supplier_name" {...register('supplier_name')} />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select onValueChange={(value) => setValue('status', value)} defaultValue={bill.status}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {status === 'paid' && (
        <div className="space-y-4 p-4 border rounded-md bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select onValueChange={(value) => setValue('payment_method', value)} defaultValue={bill.payment_method}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paid_date">Paid Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                   <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paidDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paidDate ? format(paidDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={paidDate} onSelect={(date) => setValue('paid_date', date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label>Place of Supply</Label>
            <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                    {INDIAN_STATES_DATA.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="itc" checked={eligibleForItc} onChange={(e) => setEligibleForItc(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <Label htmlFor="itc">Eligible for Input Tax Credit (ITC)</Label>
          </div>
          <div>
            <Label htmlFor="receipt">Upload Receipt</Label>
            <div className="flex items-center gap-2">
                <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1"/>
            </div>
            {receiptFile && <p className="text-sm text-muted-foreground mt-1">{receiptFile.name}</p>}
            {bill.receipt_url && !receiptFile && <a href={bill.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">View current receipt</a>}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Bill'}</Button>
      </div>
    </form>
  );
};

export default UpdateBillForm;