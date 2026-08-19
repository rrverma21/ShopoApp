import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const WaterDeliveryAreaForm = ({ area, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    delivery_charge: '',
    is_active: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || '',
        description: area.description || '',
        delivery_charge: area.delivery_charge || '',
        is_active: area.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        delivery_charge: '',
        is_active: true
      });
    }
    setErrors({});
  }, [area]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Area Name is required';
    
    if (formData.delivery_charge === '') {
      newErrors.delivery_charge = 'Delivery Charge is required';
    } else if (isNaN(formData.delivery_charge) || Number(formData.delivery_charge) < 0) {
      newErrors.delivery_charge = 'Charge must be a valid positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave({
        ...formData,
        delivery_charge: Number(formData.delivery_charge)
      });
    } catch (error) {
      console.error("Error saving area:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Area Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Downtown, North Sector"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter details about this delivery area (e.g. valid pincodes or landmarks)"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_charge" className="text-sm font-medium">Delivery Charge (₹) <span className="text-red-500">*</span></Label>
        <Input
          id="delivery_charge"
          name="delivery_charge"
          type="number"
          min="0"
          step="0.01"
          value={formData.delivery_charge}
          onChange={handleChange}
          placeholder="0.00"
          className={errors.delivery_charge ? 'border-red-500' : ''}
        />
        {errors.delivery_charge && <p className="text-xs text-red-500 mt-1">{errors.delivery_charge}</p>}
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active Status</Label>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Area'
          )}
        </Button>
      </div>
    </form>
  );
};

export default WaterDeliveryAreaForm;