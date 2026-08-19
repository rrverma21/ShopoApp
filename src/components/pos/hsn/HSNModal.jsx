import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const HSNModal = ({ isOpen, onClose, editingHSN, onSuccess }) => {
  const { createHSN, updateHSN } = useHSNMaster();
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    hsn_code: '',
    gst_percentage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (editingHSN) {
        setFormData({
          label: editingHSN.label || '',
          description: editingHSN.description || '',
          hsn_code: editingHSN.hsn_code || '',
          gst_percentage: editingHSN.gst_percentage !== undefined && editingHSN.gst_percentage !== null ? editingHSN.gst_percentage.toString() : ''
        });
      } else {
        setFormData({
          label: '',
          description: '',
          hsn_code: '',
          gst_percentage: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editingHSN]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.label.trim()) {
      newErrors.label = 'HSN Label is required';
    } else if (formData.label.trim().length > 100) {
      newErrors.label = 'Maximum 100 characters allowed';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Maximum 500 characters allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    // Validate form
    if (!validate()) return;

    setIsSubmitting(true);
    
    try {
      // Prepare submission data
      const submissionData = {
        label: formData.label.trim(),
        description: formData.description.trim(),
        hsn_code: formData.hsn_code.trim(),
        gst_percentage: formData.gst_percentage ? parseFloat(formData.gst_percentage) : 0
      };

      let result;
      if (editingHSN) {
        // Update existing HSN
        result = await updateHSN(editingHSN.id, submissionData);
      } else {
        // Create new HSN
        result = await createHSN(submissionData);
      }

      if (result.success) {
        // Success: show toast, refresh list, clear form, and close modal
        toast.success(`HSN code ${editingHSN ? 'updated' : 'created'} successfully`);
        
        // Clear form state
        setFormData({
          label: '',
          description: '',
          hsn_code: '',
          gst_percentage: ''
        });
        setErrors({});
        
        // Refresh HSN list via callback
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal
        onClose();
      } else {
        // Error: show toast and keep modal open
        toast.error(result.error || 'Failed to save HSN code');
      }
    } catch (err) {
      // Unexpected error: show generic error and keep modal open
      console.error('HSN submission error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingHSN ? 'Edit HSN Code' : 'Add New HSN Code'}</DialogTitle>
          <DialogDescription>
            {editingHSN 
              ? 'Update the details of your existing HSN code.' 
              : 'Create a new Harmonized System of Nomenclature code for your products.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">HSN Label <span className="text-red-500">*</span></Label>
            <Input 
              id="label" 
              name="label" 
              value={formData.label} 
              onChange={handleChange} 
              placeholder="e.g. Food Preparations"
              className={errors.label ? "border-red-500" : ""}
              maxLength={100}
              disabled={isSubmitting}
            />
            {errors.label && <p className="text-xs text-red-500">{errors.label}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input 
                id="hsn_code" 
                name="hsn_code" 
                value={formData.hsn_code} 
                onChange={handleChange} 
                placeholder="e.g. 2106"
                maxLength={20}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst_percentage">GST (%)</Label>
              <Input 
                id="gst_percentage" 
                name="gst_percentage" 
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.gst_percentage} 
                onChange={handleChange} 
                placeholder="e.g. 18"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(Optional)</span></Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Detailed description of goods covered by this HSN..."
              className={errors.description ? "border-red-500 min-h-[80px]" : "min-h-[80px]"}
              maxLength={500}
              disabled={isSubmitting}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingHSN ? 'Save Changes' : 'Create HSN'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HSNModal;