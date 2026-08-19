import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

const ShopTypeForm = ({ initialData, onSubmit, isSubmitting, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    is_active: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        icon: initialData.icon || '',
        is_active: initialData.is_active ?? true
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="name">Shop Type Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Grocery Store"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon (Emoji)</Label>
        <Input
          id="icon"
          name="icon"
          value={formData.icon}
          onChange={handleChange}
          placeholder="e.g. 🛒"
          className="text-2xl"
        />
        <p className="text-xs text-slate-500">You can paste an emoji here to represent the shop type.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional description..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
        <div className="space-y-0.5">
          <Label htmlFor="is_active">Active Status</Label>
          <p className="text-xs text-slate-500">Inactive types won't appear in dropdowns</p>
        </div>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={handleSwitchChange}
        />
      </div>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Shop Type' : 'Add Shop Type'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ShopTypeForm;