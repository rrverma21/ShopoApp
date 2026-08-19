import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarPlus as CalendarIcon, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const EXPENSE_TYPES = [
  'Light Bill',
  'Water Bill',
  'Shop Rent',
  'Maintenance',
  'Insurance',
  'Utilities',
  'Other'
];

const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other'
];

const AddExpenseModal = ({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    expense_type: '',
    description: '',
    amount: '',
    date: new Date(),
    gst_applicable: false,
    gst_amount: '',
    payment_method: '',
    reference_no: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Stringify initialData to prevent infinite re-renders if parent passes a new object reference each time
  const initialDataStr = initialData ? JSON.stringify(initialData) : null;

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          expense_type: initialData.expense_type || '',
          description: initialData.description || '',
          amount: initialData.amount?.toString() || '',
          date: initialData.date ? new Date(initialData.date) : (initialData.expense_date ? new Date(initialData.expense_date) : new Date()),
          gst_applicable: initialData.gst_applicable || false,
          gst_amount: initialData.gst_amount?.toString() || '',
          payment_method: initialData.payment_method || '',
          reference_no: initialData.reference_no || '',
          notes: initialData.notes || ''
        });
      } else {
        setFormData({
          expense_type: '',
          description: '',
          amount: '',
          date: new Date(),
          gst_applicable: false,
          gst_amount: '',
          payment_method: '',
          reference_no: '',
          notes: ''
        });
      }
      setErrors({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDataStr]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.expense_type) newErrors.expense_type = 'Expense type is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.payment_method) newErrors.payment_method = 'Payment method is required';
    
    if (formData.gst_applicable && (!formData.gst_amount || parseFloat(formData.gst_amount) < 0)) {
      newErrors.gst_amount = 'Valid GST amount is required when GST is applicable';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        variant: 'destructive'
      });
      return;
    }

    const submitData = {
      expense_type: formData.expense_type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: format(formData.date, 'yyyy-MM-dd'),
      gst_applicable: formData.gst_applicable,
      gst_amount: formData.gst_applicable ? parseFloat(formData.gst_amount || 0) : 0,
      payment_method: formData.payment_method,
      reference_no: formData.reference_no,
      notes: formData.notes
    };

    try {
      await onSubmit(submitData);
      toast({
        title: 'Success',
        description: initialData ? 'Expense updated successfully' : 'Expense added successfully'
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save expense',
        variant: 'destructive'
      });
    }
  };

  const totalAmount = (parseFloat(formData.amount) || 0) + (formData.gst_applicable ? (parseFloat(formData.gst_amount) || 0) : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Business Expense' : 'Add New Business Expense'}</DialogTitle>
          <DialogDescription>
            Record your business expenses for accurate financial tracking and GST reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_type">Expense Type <span className="text-red-500">*</span></Label>
              <Select value={formData.expense_type} onValueChange={(value) => handleChange('expense_type', value)}>
                <SelectTrigger className={cn(errors.expense_type && "border-red-500")}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expense_type && <p className="text-xs text-red-500">{errors.expense_type}</p>}
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer", 
                      !formData.date && "text-muted-foreground", 
                      errors.date && "border-red-500"
                    )}
                    aria-expanded={datePickerOpen}
                    aria-haspopup="dialog"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar 
                    mode="single" 
                    selected={formData.date} 
                    defaultMonth={formData.date}
                    onSelect={(d) => { 
                      if (d) {
                        handleChange('date', d); 
                        setDatePickerOpen(false); 
                      }
                    }} 
                    required
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Brief description of expense" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) <span className="text-red-500">*</span></Label>
              <Input id="amount" type="number" min="0" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} className={cn(errors.amount && "border-red-500")} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method <span className="text-red-500">*</span></Label>
              <Select value={formData.payment_method} onValueChange={(value) => handleChange('payment_method', value)}>
                <SelectTrigger className={cn(errors.payment_method && "border-red-500")}>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Switch id="gst_applicable" checked={formData.gst_applicable} onCheckedChange={(checked) => handleChange('gst_applicable', checked)} />
            <Label htmlFor="gst_applicable" className="cursor-pointer">GST Applicable</Label>
          </div>

          {formData.gst_applicable && (
            <div className="space-y-2">
              <Label htmlFor="gst_amount">GST Amount (₹) <span className="text-red-500">*</span></Label>
              <Input id="gst_amount" type="number" min="0" step="0.01" placeholder="0.00" value={formData.gst_amount} onChange={(e) => handleChange('gst_amount', e.target.value)} className={cn(errors.gst_amount && "border-red-500")} />
              {errors.gst_amount && <p className="text-xs text-red-500">{errors.gst_amount}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reference_no">Reference/Bill Number</Label>
            <Input id="reference_no" placeholder="Reference or bill number" value={formData.reference_no} onChange={(e) => handleChange('reference_no', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Additional notes or remarks" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Total Amount (incl. GST):</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors shadow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {initialData ? 'Update' : 'Save'} Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;