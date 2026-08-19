import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Green', value: '#10B981', class: 'bg-green-500' },
  { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
  { name: 'Yellow', value: '#F59E0B', class: 'bg-yellow-500' },
  { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
  { name: 'Indigo', value: '#6366F1', class: 'bg-indigo-500' },
  { name: 'Orange', value: '#F97316', class: 'bg-orange-500' },
  { name: 'Teal', value: '#14B8A6', class: 'bg-teal-500' },
  { name: 'Cyan', value: '#06B6D4', class: 'bg-cyan-500' }
];

const PRESET_ICONS = [
  { name: 'Package', value: 'package' },
  { name: 'Shirt', value: 'shirt' },
  { name: 'Coffee', value: 'coffee' },
  { name: 'Book', value: 'book' },
  { name: 'Smartphone', value: 'smartphone' },
  { name: 'Headphones', value: 'headphones' },
  { name: 'Camera', value: 'camera' },
  { name: 'Utensils', value: 'utensils' },
  { name: 'Home', value: 'home' },
  { name: 'Laptop', value: 'laptop' },
  { name: 'ShoppingBag', value: 'shopping-bag' },
  { name: 'Truck', value: 'truck' }
];

const ProductCategoryModal = ({ isOpen, onClose, onSave, editingCategory = null, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '',
    icon: ''
  });

  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes or editing category changes
  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setFormData({
          name: editingCategory.name || '',
          description: editingCategory.description || '',
          color: editingCategory.color || '',
          icon: editingCategory.icon || ''
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '',
          icon: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editingCategory]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Category name must be 100 characters or less';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const result = await onSave({
      id: editingCategory?.id,
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color,
      icon: formData.icon
    });

    if (result?.success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Electronics, Clothing, Food"
              maxLength={100}
              disabled={isSubmitting}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what products belong to this category..."
              maxLength={500}
              rows={3}
              disabled={isSubmitting}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label htmlFor="color">
              Badge Color <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleChange('color', color.value)}
                  disabled={isSubmitting}
                  className={`h-10 rounded-md border-2 transition-all ${
                    formData.color === color.value 
                      ? 'border-primary scale-110 ring-2 ring-primary ring-offset-2' 
                      : 'border-border hover:scale-105'
                  } ${color.class}`}
                  title={color.name}
                />
              ))}
            </div>
            {formData.color && (
              <div className="flex items-center gap-2 mt-2">
                <div 
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-sm text-muted-foreground">Selected: {formData.color}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleChange('color', '')}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label htmlFor="icon">
              Icon <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Select 
              value={formData.icon || 'none'} 
              onValueChange={(value) => handleChange('icon', value === 'none' ? '' : value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="icon">
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Icon</SelectItem>
                {PRESET_ICONS.filter(icon => icon && icon.value && icon.value.trim() !== '').map((icon) => (
                  <SelectItem key={icon.value} value={icon.value}>
                    {icon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductCategoryModal;