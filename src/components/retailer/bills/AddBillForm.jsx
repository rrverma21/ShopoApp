import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Import New Components and Hooks
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { useDiorSuppliers } from '@/hooks/useDiorSuppliers';
import { useDiorCategories } from '@/hooks/useDiorCategories';

const GST_SLABS = [5, 12, 18, 28];

const AddBillForm = ({ onBillAdded, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fetch Data using Custom Hooks
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useDiorSuppliers();
  const { data: categories = [], isLoading: isLoadingCategories } = useDiorCategories();

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      due_date: new Date(),
      taxable_value: '', // Initialize as empty string to show placeholder
      cgst_5: '', sgst_5: '',
      cgst_12: '', sgst_12: '',
      cgst_18: '', sgst_18: '',
      cgst_28: '', sgst_28: '',
      total_gst_amount: 0,
      amount: 0,
      supplier_id: '',
      supplier_name: '',
      supplier_gstin: '',
      category_id: '',
    }
  });

  const watchAllFields = watch();

  // Auto-calculate GST and Totals
  useEffect(() => {
    const taxable = parseFloat(watchAllFields.taxable_value) || 0;
    
    let totalGst = 0;
    GST_SLABS.forEach(slab => {
      totalGst += (parseFloat(watchAllFields[`cgst_${slab}`]) || 0) + (parseFloat(watchAllFields[`sgst_${slab}`]) || 0);
    });

    const grandTotal = taxable + totalGst;

    setValue('total_gst_amount', totalGst.toFixed(2));
    setValue('amount', grandTotal.toFixed(2));
  }, [
      watchAllFields.taxable_value, 
      ...GST_SLABS.flatMap(slab => [watchAllFields[`cgst_${slab}`], watchAllFields[`sgst_${slab}`]]),
      setValue
  ]);

  const handleGstChange = (slab, type, value) => {
    const numericValue = value ? parseFloat(value) : '';
    const otherType = type === 'cgst' ? 'sgst' : 'cgst';
    setValue(`${type}_${slab}`, numericValue);
    setValue(`${otherType}_${slab}`, numericValue);
  };
  
  const handleSupplierSelect = (supplierId) => {
    if (!supplierId) {
        setValue('supplier_id', '');
        setValue('supplier_name', '');
        setValue('supplier_gstin', '');
        return;
    }
    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    if (selectedSupplier) {
      setValue('supplier_id', selectedSupplier.id);
      setValue('supplier_name', selectedSupplier.name);
      setValue('supplier_gstin', selectedSupplier.gstin || '');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Category name cannot be empty', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('dior_bill_categories')
        .insert({ name: newCategoryName, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate the cache to refresh the dropdown list
      queryClient.invalidateQueries({ queryKey: ['dior_bill_categories', user.id] });
      
      toast({ title: `Category "${newCategoryName}" added successfully!` });
      setNewCategoryName('');
      setIsAddingCategory(false);
      setValue('category_id', data.id);

    } catch (error) {
      toast({ title: 'Error adding category', description: error.message, variant: 'destructive' });
    }
  };

  const onSubmit = async (formData) => {
    try {
      if (!formData.supplier_name) {
          toast({ title: 'Supplier Name is required', variant: 'destructive' });
          return;
      }

      if (!formData.category_id) {
          toast({ title: 'Category is required', variant: 'destructive' });
          return;
      }

      const billData = {
        user_id: user.id,
        supplier_name: formData.supplier_name,
        supplier_gstin: formData.supplier_gstin,
        bill_number: formData.bill_number,
        description: formData.description,
        due_date: format(formData.due_date, 'yyyy-MM-dd'),
        category_id: formData.category_id,
        status: 'unpaid',
        bill_type: 'simple',
        amount: parseFloat(formData.amount),
        taxable_value: parseFloat(formData.taxable_value) || 0,
        total_gst_amount: parseFloat(formData.total_gst_amount) || 0,
        gst_5_amount: (parseFloat(formData.cgst_5) || 0) + (parseFloat(formData.sgst_5) || 0),
        gst_12_amount: (parseFloat(formData.cgst_12) || 0) + (parseFloat(formData.sgst_12) || 0),
        gst_18_amount: (parseFloat(formData.cgst_18) || 0) + (parseFloat(formData.sgst_18) || 0),
        gst_28_amount: (parseFloat(formData.cgst_28) || 0) + (parseFloat(formData.sgst_28) || 0),
      };

      const { error } = await supabase.from('dior_bills').insert(billData);
      if (error) throw error;

      toast({ title: 'Bill added successfully!' });
      onBillAdded();
    } catch (error) {
      toast({ title: 'Error adding bill', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-4">
        {/* Supplier Info */}
        <div className="space-y-4">
            <div>
                <Label className="mb-1.5 block">Search Supplier</Label>
                <Controller
                    name="supplier_id"
                    control={control}
                    render={({ field }) => (
                        <SearchableDropdown
                            label="Select Supplier..."
                            placeholder="Search suppliers..."
                            options={suppliers}
                            value={field.value}
                            onChange={(val) => {
                                field.onChange(val);
                                handleSupplierSelect(val);
                            }}
                            isLoading={isLoadingSuppliers}
                        />
                    )}
                />
                <p className="text-xs text-muted-foreground mt-1">Select from list to auto-fill details, or type manually below.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_name">Supplier Name</Label>
                  <Input 
                    id="supplier_name" 
                    {...register('supplier_name', { required: 'Supplier name is required' })} 
                    className="bg-white dark:bg-slate-900" 
                    placeholder="Enter supplier name"
                  />
                  {errors.supplier_name && <p className="text-red-500 text-sm mt-1">{errors.supplier_name.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="supplier_gstin">Supplier GST No</Label>
                  <Input 
                    id="supplier_gstin" 
                    {...register('supplier_gstin')} 
                    className="bg-white dark:bg-slate-900" 
                    placeholder="GSTIN (Optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="bill_number">Bill Number</Label>
                  <Input id="bill_number" {...register('bill_number')} className="bg-white dark:bg-slate-900" placeholder="Invoice #" />
                </div>
                <div>
                    <Label htmlFor="category_id" className="mb-1.5 block">Category / Ledger</Label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Controller
                                name="category_id"
                                control={control}
                                rules={{ required: 'Category is required' }}
                                render={({ field }) => (
                                    <SearchableDropdown
                                        label="Select Category..."
                                        options={categories}
                                        value={field.value}
                                        onChange={field.onChange}
                                        isLoading={isLoadingCategories}
                                        error={errors.category_id?.message}
                                    />
                                )}
                            />
                        </div>
                        <Popover open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="icon" title="Add New Category" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-2">
                                    <p className="font-medium">Add New Category</p>
                                    <Input placeholder="e.g. Utilities" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                                    <Button type="button" size="sm" onClick={handleAddCategory}>Add</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
        </div>

        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Controller
            control={control}
            name="due_date"
            rules={{ required: "Due date is required" }}
            render={({ field }) => {
              const selectedDate = field.value instanceof Date ? field.value : field.value ? new Date(field.value) : null;
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="due_date"
                      aria-label="Choose due date"
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal px-3 py-2 bg-white dark:bg-slate-900",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="truncate">
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (!date) field.onChange(null);
                        else if (date instanceof Date) field.onChange(date);
                      }}
                      initialFocus
                      numberOfMonths={1}
                      showOutsideDays={false}
                    />
                  </PopoverContent>
                </Popover>
              );
            }}
          />
          {errors.due_date && <p className="text-red-500 text-sm mt-1">{errors.due_date.message}</p>}
        </div>

        <div className="space-y-4 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-medium">Amount Details</h3>
            <div>
                <Label htmlFor="taxable_value">Total Taxable Amount</Label>
                <Input id="taxable_value" type="number" step="0.01" {...register('taxable_value', { required: 'Taxable amount is required', valueAsNumber: true })} placeholder="0.00" className="bg-white dark:bg-slate-900" />
                {errors.taxable_value && <p className="text-red-500 text-sm mt-1">{errors.taxable_value.message}</p>}
            </div>
            
            <div className="space-y-4">
              {GST_SLABS.map(slab => (
                <div key={slab} className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor={`cgst_${slab}`}>CGST @ {slab/2}%</Label>
                         <Controller
                            name={`cgst_${slab}`}
                            control={control}
                            render={({ field }) => (
                                <Input 
                                    id={`cgst_${slab}`}
                                    type="number" step="0.01" 
                                    placeholder="0.00"
                                    value={field.value}
                                    onChange={(e) => {
                                        field.onChange(e.target.value);
                                        handleGstChange(slab, 'cgst', e.target.value);
                                    }}
                                    className="bg-white dark:bg-slate-900"
                                />
                            )}
                        />
                    </div>
                    <div>
                        <Label htmlFor={`sgst_${slab}`}>SGST @ {slab/2}%</Label>
                         <Controller
                            name={`sgst_${slab}`}
                            control={control}
                            render={({ field }) => (
                                <Input 
                                    id={`sgst_${slab}`}
                                    type="number" step="0.01" 
                                    placeholder="0.00"
                                    value={field.value}
                                    onChange={(e) => {
                                        field.onChange(e.target.value);
                                        handleGstChange(slab, 'sgst', e.target.value);
                                    }}
                                    className="bg-white dark:bg-slate-900"
                                />
                            )}
                        />
                    </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg space-y-2 border">
                <h4 className="font-semibold">Summary</h4>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Taxable Value:</span><span>₹{watch('taxable_value') || '0.00'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total GST:</span><span>₹{watch('total_gst_amount') || '0.00'}</span></div>
                <div className="flex justify-between text-lg font-bold"><span >Grand Total:</span><span>₹{watch('amount') || '0.00'}</span></div>
            </div>
        </div>
        
        <div>
            <Label htmlFor="description">Notes (Optional)</Label>
            <Textarea id="description" {...register('description')} className="bg-white dark:bg-slate-900" placeholder="Additional details about this bill..." />
        </div>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Bill'}</Button>
        </div>
    </form>
  );
};

export default AddBillForm;