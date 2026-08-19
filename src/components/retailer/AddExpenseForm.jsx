import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indianStates } from '@/lib/indianStates';

const GST_RATES = [0, 5, 12, 18, 28];

const AddExpenseForm = ({ onExpenseAdded, onCancel }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
        queryKey: ['dior_suppliers', user.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('dior_suppliers')
                .select('*')
                .eq('user_id', user.id)
                .order('name');
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!user,
    });

    const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            expense_date: new Date(),
            taxable_value: 0,
            gst_rate: 0,
            total_value: 0,
            eligible_for_itc: true,
            vendor_name: '',
            vendor_gstin: '',
        }
    });

    const watchFields = watch(['taxable_value', 'gst_rate']);
    const watchVendorId = watch('vendor_id'); 

    useEffect(() => {
        const taxable = parseFloat(watchFields[0]) || 0;
        const gstRate = parseFloat(watchFields[1]) || 0;
        let cgst = 0, sgst = 0, igst = 0;

        const placeOfSupply = watch('place_of_supply');
        // Default to Maharashtra for now as we don't fetch user profile state here yet
        const userState = 'Maharashtra'; 

        if (placeOfSupply === userState) {
            cgst = (taxable * gstRate / 100) / 2;
            sgst = (taxable * gstRate / 100) / 2;
        } else {
            igst = (taxable * gstRate / 100);
        }

        setValue('cgst_amount', cgst.toFixed(2));
        setValue('sgst_amount', sgst.toFixed(2));
        setValue('igst_amount', igst.toFixed(2));
        setValue('total_value', (taxable + cgst + sgst + igst).toFixed(2));

    }, [watchFields, watch('place_of_supply'), setValue]);

    const handleSupplierSelect = (supplierId) => {
        if (!supplierId) {
            return;
        }
        const selectedSupplier = suppliers.find(s => s.id === supplierId);
        if (selectedSupplier) {
            setValue('vendor_name', selectedSupplier.name);
            setValue('vendor_gstin', selectedSupplier.gstin || '');
        }
    };
    
    const supplierOptions = suppliers?.map(s => ({ value: s.id, label: s.name })) || [];


    const onSubmit = async (formData) => {
        try {
            const expenseData = {
                user_id: user.id,
                ...formData,
                expense_date: format(formData.expense_date, 'yyyy-MM-dd'),
                taxable_value: parseFloat(formData.taxable_value),
                cgst_amount: parseFloat(formData.cgst_amount),
                sgst_amount: parseFloat(formData.sgst_amount),
                igst_amount: parseFloat(formData.igst_amount),
                total_value: parseFloat(formData.total_value),
            };
            
            delete expenseData.vendor_id; 

            const { error } = await supabase.from('dior_expenses').insert(expenseData);
            if (error) throw error;

            toast({ title: 'Expense added successfully!' });
            onExpenseAdded();
        } catch (error) {
            toast({ title: 'Error adding expense', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-4">
            <div>
                <Label>Select Vendor/Supplier (Optional)</Label>
                <div className="mt-1.5">
                    <SearchableSelect
                        options={supplierOptions}
                        onSelect={handleSupplierSelect}
                        placeholder="Search and select a vendor..."
                        disabled={isLoadingSuppliers}
                    />
                </div>
                 <p className="text-xs text-muted-foreground mt-1">Select to auto-fill details, or type manually below.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="vendor_name">Vendor Name</Label>
                    <Input id="vendor_name" {...register('vendor_name', { required: 'Vendor name is required' })} className="bg-white dark:bg-slate-900" />
                    {errors.vendor_name && <p className="text-red-500 text-sm mt-1">{errors.vendor_name.message}</p>}
                </div>
                <div>
                    <Label htmlFor="vendor_gstin">Vendor GSTIN</Label>
                    <Input id="vendor_gstin" {...register('vendor_gstin')} className="bg-white dark:bg-slate-900" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="expense_date">Expense Date</Label>
                    <Controller
                        control={control}
                        name="expense_date"
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-white dark:bg-slate-900", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                        )}
                    />
                </div>
                 <div>
                    <Label htmlFor="bill_no">Bill No.</Label>
                    <Input id="bill_no" {...register('bill_no')} className="bg-white dark:bg-slate-900" />
                </div>
            </div>
            
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="expense_type">Expense Type</Label>
                    <Input id="expense_type" {...register('expense_type', { required: 'Expense type is required' })} className="bg-white dark:bg-slate-900" />
                    {errors.expense_type && <p className="text-red-500 text-sm mt-1">{errors.expense_type.message}</p>}
                </div>
                <div>
                    <Label htmlFor="place_of_supply">Place of Supply</Label>
                    <Controller
                        name="place_of_supply"
                        control={control}
                        rules={{ required: 'Place of supply is required' }}
                        render={({ field }) => (
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="bg-white dark:bg-slate-900">
                                    <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent>
                                    {indianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.place_of_supply && <p className="text-red-500 text-sm mt-1">{errors.place_of_supply.message}</p>}
                </div>
             </div>

            <div className="space-y-4 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-medium">Amount Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="taxable_value">Taxable Value</Label>
                        <Input id="taxable_value" type="number" step="0.01" {...register('taxable_value', { required: true, valueAsNumber: true })} className="bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                        <Label htmlFor="gst_rate">GST Rate (%)</Label>
                        <Controller
                            name="gst_rate"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={(val) => field.onChange(parseFloat(val))} value={String(field.value)}>
                                    <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {GST_RATES.map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                     <div>
                        <Label htmlFor="cgst_amount">CGST</Label>
                        <Input id="cgst_amount" {...register('cgst_amount')} readOnly className="bg-muted" />
                    </div>
                    <div>
                        <Label htmlFor="sgst_amount">SGST/UTGST</Label>
                        <Input id="sgst_amount" {...register('sgst_amount')} readOnly className="bg-muted"/>
                    </div>
                    <div>
                        <Label htmlFor="igst_amount">IGST</Label>
                        <Input id="igst_amount" {...register('igst_amount')} readOnly className="bg-muted"/>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total Value:</span>
                        <span>₹{watch('total_value') || '0.00'}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Expense'}</Button>
            </div>
        </form>
    );
};

export default AddExpenseForm;