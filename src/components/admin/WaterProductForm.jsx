import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const WaterProductForm = ({ product, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    is_available: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        is_available: product.is_available !== false // Default to true if undefined
      });
    } else {
       setFormData({
        name: '',
        description: '',
        price: '',
        is_available: true
      });
    }
    setErrors({});
  }, [product]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    
    // Check if price is a valid number and greater than 0
    if (!formData.price) {
      newErrors.price = 'Base Price is required';
    } else if (isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a valid positive number';
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
        price: Number(formData.price) // Ensure price is sent as a number
      });
    } catch (error) {
      console.error("Error saving product:", error);
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
    // Clear error for this field as user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Product Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. 20L Water Can"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter product description"
          rows={3}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price" className="text-sm font-medium">Base Price (₹) <span className="text-red-500">*</span></Label>
        <Input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
          placeholder="0.00"
          className={errors.price ? 'border-red-500' : ''}
        />
        {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="is_available"
          checked={formData.is_available}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
        />
        <Label htmlFor="is_available">Available for ordering</Label>
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
            'Save Product'
          )}
        </Button>
      </div>
    </form>
  );
};

export default WaterProductForm;