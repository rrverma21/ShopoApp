import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ArrowLeft, Plus, Folder, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('blog_categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Failed to fetch categories.');
      toast({
        title: 'Error',
        description: 'Failed to load blog categories.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    
    if (!trimmedName) {
      toast({ title: 'Validation Error', description: 'Category name is required.', variant: 'destructive' });
      return;
    }

    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      toast({ title: 'Duplicate Category', description: 'A category with this name already exists.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('blog_categories')
        .insert([{ name: trimmedName, color: newCategoryColor }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: 'Success', description: 'Blog category created successfully!' });
      
      setCategories([data, ...categories]);
      
      setIsAddDialogOpen(false);
      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
    } catch (err) {
      console.error('Error creating category:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create category.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('blog_categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({ title: 'Deleted', description: 'Category has been removed.' });
      setCategories(categories.filter((cat) => cat.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete category. It might be in use.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/blog')} 
          className="pl-0 hover:bg-transparent hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back To Dashboard
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)} variant="default">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>
      
      <div className="bg-card text-card-foreground shadow-sm rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            Blog Categories
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Organize your blog posts into categories for better discoverability.</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Failed to load categories</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
              <Button onClick={fetchCategories} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No categories found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">Create your first category to start organizing your blog content effectively.</p>
              <Button onClick={() => setIsAddDialogOpen(true)} variant="default">
                <Plus className="w-4 h-4 mr-2" /> Create First Category
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Card key={category.id} className="group hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner" 
                        style={{ backgroundColor: category.color || '#e2e8f0' }} 
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate" title={category.name}>
                        {category.name}
                      </span>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the category "{category.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateCategory}>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Category Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Technology, Tutorials, News"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="color">Badge Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    className="w-12 h-10 p-1 cursor-pointer"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                  />
                  <Input 
                    type="text" 
                    value={newCategoryColor} 
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="flex-1 font-mono uppercase"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Select a color to visually distinguish this category.</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create Category'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}