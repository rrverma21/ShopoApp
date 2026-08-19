import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Search, Edit, Trash2, FolderOpen, 
  Package, AlertCircle 
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import CategoryForm from './CategoryForm';
import DeleteCategoryDialog from './DeleteCategoryDialog';

const CategoryManagementModal = ({ open, onOpenChange }) => {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    
    const search = searchTerm.toLowerCase();
    return categories.filter(cat => 
      cat.name?.toLowerCase().includes(search) ||
      cat.description?.toLowerCase().includes(search)
    );
  }, [categories, searchTerm]);

  // Handle create category
  const handleCreateCategory = async (formData) => {
    setFormLoading(true);
    const result = await createCategory(formData, () => {
      setShowForm(false);
      setFormLoading(false);
    });
    if (!result.success) {
      setFormLoading(false);
    }
  };

  // Handle update category
  const handleUpdateCategory = async (formData) => {
    setFormLoading(true);
    const result = await updateCategory(editingCategory.id, formData, () => {
      setShowForm(false);
      setEditingCategory(null);
      setFormLoading(false);
    });
    if (!result.success) {
      setFormLoading(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    const result = await deleteCategory(deletingCategory.id, () => {
      setDeletingCategory(null);
    });
    return result.success;
  };

  // Handle edit click
  const handleEditClick = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  // Render category list view
  const renderCategoryList = () => (
    <div className="space-y-4">
      {/* Search and Create Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="min-w-[160px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Category
        </Button>
      </div>

      {/* Categories Grid */}
      <ScrollArea className="h-[400px] pr-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              {searchTerm ? 'No categories found' : 'No categories yet'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Create your first category to organize products'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map((category) => (
              <Card 
                key={category.id} 
                className="category-card hover:shadow-md transition-all duration-200 border-2"
                style={{ borderColor: `${category.color}20` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                      />
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {category.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditClick(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeletingCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {category.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {category.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-slate-400" />
                    <Badge variant={category.product_count > 0 ? "default" : "secondary"} className="text-xs">
                      {category.product_count} product{category.product_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary Footer */}
      {!loading && filteredCategories.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredCategories.length} of {categories.length} categories
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <FolderOpen className="h-6 w-6" />
              {showForm ? (editingCategory ? 'Edit Category' : 'Create Category') : 'Category Management'}
            </DialogTitle>
            <DialogDescription>
              {showForm 
                ? (editingCategory ? 'Update category details below' : 'Create a new category to organize your products')
                : 'Organize your products with custom categories'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {showForm ? (
              <ScrollArea className="h-full pr-4">
                <CategoryForm
                  initialData={editingCategory}
                  onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
                  onCancel={handleCancelForm}
                  loading={formLoading}
                />
              </ScrollArea>
            ) : (
              renderCategoryList()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteCategoryDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        category={deletingCategory}
        onConfirm={handleDeleteCategory}
      />
    </>
  );
};

export default CategoryManagementModal;