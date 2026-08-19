import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';

const CategoryForm = ({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    color: '#3b82f6',
    icon: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        image_url: initialData.image_url || '',
        color: initialData.color || '#3b82f6',
        icon: initialData.icon || ''
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Name */}
      <div className="space-y-2">
        <Label htmlFor="category-name" className="text-sm font-semibold">
          Category Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="category-name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Electronics, Groceries, Clothing"
          className={`text-slate-900 dark:text-slate-100 ${errors.name ? 'border-red-500' : ''}`}
          autoFocus
        />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="category-description" className="text-sm font-semibold">
          Description
        </Label>
        <Textarea
          id="category-description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Optional: Add a description for this category"
          className="text-slate-900 dark:text-slate-100 min-h-[80px] resize-none"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          This helps you and your team understand what products belong in this category
        </p>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <Label htmlFor="category-color" className="text-sm font-semibold">
          Category Color
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="category-color"
            type="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-20 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            placeholder="#3b82f6"
            className="text-slate-900 dark:text-slate-100 flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Choose a color to help visually identify this category
        </p>
      </div>

      {/* Icon (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="category-icon" className="text-sm font-semibold">
          Icon Name
        </Label>
        <Input
          id="category-icon"
          value={formData.icon}
          onChange={(e) => handleChange('icon', e.target.value)}
          placeholder="e.g., Package, ShoppingCart, Smartphone"
          className="text-slate-900 dark:text-slate-100"
        />
        <p className="text-xs text-muted-foreground">
          Optional: Lucide icon name for visual representation
        </p>
      </div>

      {/* Image URL (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="category-image" className="text-sm font-semibold">
          Image URL
        </Label>
        <Input
          id="category-image"
          value={formData.image_url}
          onChange={(e) => handleChange('image_url', e.target.value)}
          placeholder="https://example.com/category-image.jpg"
          className="text-slate-900 dark:text-slate-100"
        />
        <p className="text-xs text-muted-foreground">
          Optional: URL to an image representing this category
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {initialData ? 'Update' : 'Create'} Category
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;