import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CategoryManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      toast({ title: 'Error fetching categories', description: error.message, variant: 'destructive' });
    } else {
      setCategories(data);
    }
    setLoading(false);
  }, [toast, user.id]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [fetchCategories, user]);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit = async (values) => {
    let image_url = values.image_url;

    if (values.imageFile) {
      const fileExt = values.imageFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `public/category-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, values.imageFile);
      
      if(uploadError) {
         toast({ title: "Image Upload Error", description: uploadError.message, variant: "destructive" });
         return;
      }

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
      image_url = publicUrl;
    }

    const trimmedName = values.name.trim();

    const { data: existing, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', trimmedName)
      .eq('seller_id', user.id)
      .maybeSingle();

    if (checkError) {
      toast({ title: 'Error', description: 'Failed to validate category name.', variant: 'destructive' });
      return;
    }

    if (existing && (!editingCategory || existing.id !== editingCategory.id)) {
      toast({ title: 'Validation Error', description: 'You already have a category with this name.', variant: 'destructive' });
      return;
    }

    const categoryData = {
      name: trimmedName,
      description: values.description || null,
      color: values.color === 'none' ? null : values.color,
      icon: values.icon === 'none' ? null : values.icon,
      image_url: image_url,
      seller_id: user.id,
    };

    if (editingCategory) {
      const { error } = await supabase.from('categories').update(categoryData).eq('id', editingCategory.id);
      if (error) {
        toast({ title: 'Error updating category', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Category updated successfully!' });
      }
    } else {
      const { error } = await supabase.from('categories').insert(categoryData);
      if (error) {
        toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Category created successfully!' });
      }
    }

    fetchCategories();
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (categoryId) => {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) {
      toast({ title: 'Error deleting category', description: "Make sure no products are using this category. " + error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Category deleted successfully' });
      fetchCategories();
    }
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Category Management</h1>
        <Button 
          onClick={openCreateForm} 
          variant="default"
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-full min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredCategories.map(category => (
              <motion.div
                key={category.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="h-full flex flex-col glass-effect">
                    <CardHeader>
                        <div className="w-full aspect-video bg-slate-100 rounded-md mb-2 overflow-hidden">
                            {category.image_url ? (
                                <img src={category.image_url} alt={category.name} className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <ImageIcon size={40}/>
                                </div>
                            )}
                        </div>
                        <CardTitle className="truncate text-lg">{category.name}</CardTitle>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                        )}
                    </CardHeader>
                  <CardContent className="flex justify-end gap-2 mt-auto pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEditForm(category)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the category.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(category.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        category={editingCategory}
      />
    </div>
  );
};

const CategoryForm = ({ isOpen, onClose, onSubmit, category }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('none');
  const [icon, setIcon] = useState('none');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');

  const colorOptions = [
    { value: 'none', label: 'None' },
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'purple', label: 'Purple' },
    { value: 'orange', label: 'Orange' },
    { value: 'pink', label: 'Pink' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'teal', label: 'Teal' },
    { value: 'gray', label: 'Gray' }
  ];

  const iconOptions = [
    { value: 'none', label: 'None' },
    { value: 'package', label: 'Package' },
    { value: 'shopping-bag', label: 'Shopping Bag' },
    { value: 'shirt', label: 'Shirt' },
    { value: 'utensils', label: 'Utensils' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'smartphone', label: 'Smartphone' },
    { value: 'home', label: 'Home' },
    { value: 'heart', label: 'Heart' },
    { value: 'star', label: 'Star' },
    { value: 'tag', label: 'Tag' }
  ];

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setColor(category.color || 'none');
      setIcon(category.icon || 'none');
      setPreview(category.image_url || '');
    } else {
      setName('');
      setDescription('');
      setColor('none');
      setIcon('none');
      setPreview('');
    }
    setImageFile(null);
  }, [category, isOpen]);

  useEffect(() => {
    if (!imageFile) return;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      name, 
      description,
      color,
      icon,
      imageFile, 
      image_url: category?.image_url 
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        setImageFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Create New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Electronics, Clothing, Food"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category-color">Display Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger id="category-color">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category-icon">Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="category-icon">
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
             <Label htmlFor="category-image">Category Image</Label>
             <Input 
               id="category-image" 
               type="file" 
               accept="image/*" 
               onChange={handleFileChange} 
             />
             <p className="text-xs text-muted-foreground mt-1">
               Upload an image to represent this category (optional)
             </p>
          </div>
          
          {preview && (
            <div className="mt-4">
                <Label>Preview</Label>
                <img 
                  src={preview} 
                  alt="Category preview" 
                  className="w-full h-auto rounded-md object-cover max-h-48 border"
                />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="default"
            >
              {category ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManagement;