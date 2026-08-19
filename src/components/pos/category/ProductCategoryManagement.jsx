import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, FolderOpen, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useProductCategories } from '@/hooks/useProductCategories';
import ProductCategoryModal from './ProductCategoryModal';

const ProductCategoryManagement = () => {
  const {
    categories,
    loading,
    createProductCategory,
    updateProductCategory,
    deleteProductCategory,
    subscribeToProductCategoryChanges
  } = useProductCategories();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, category: null });

  // Keyboard shortcut to open modal (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToProductCategoryChanges((payload) => {
      console.log('Real-time category update:', payload);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToProductCategoryChanges]);

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = [...categories];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.name?.toLowerCase().includes(search) ||
        cat.description?.toLowerCase().includes(search)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'product_count':
          aVal = a.product_count || 0;
          bVal = b.product_count || 0;
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          break;
        default:
          aVal = (a[sortConfig.key] || '').toString().toLowerCase();
          bVal = (b[sortConfig.key] || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [categories, searchTerm, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1 inline" />
      : <ChevronDown className="h-4 w-4 ml-1 inline" />;
  };

  // Handle save category
  const handleSaveCategory = async (categoryData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (categoryData.id) {
        result = await updateProductCategory(
          categoryData.id,
          categoryData.name,
          categoryData.description,
          categoryData.color,
          categoryData.icon
        );
      } else {
        result = await createProductCategory(
          categoryData.name,
          categoryData.description,
          categoryData.color,
          categoryData.icon
        );
      }
      
      if (result.success) {
        setIsModalOpen(false);
        setEditingCategory(null);
      }
      
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit category
  const handleEdit = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  // Handle delete category
  const handleDelete = async (category) => {
    setDeleteConfirmation({ isOpen: true, category });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.category) return;

    const result = await deleteProductCategory(deleteConfirmation.category.id);
    
    if (result.success) {
      setDeleteConfirmation({ isOpen: false, category: null });
    } else if (result.productCount && result.productCount > 0) {
      // Error toast already shown by hook
      setDeleteConfirmation({ isOpen: false, category: null });
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            Product Categories
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your products into categories ({filteredAndSortedCategories.length} categories)
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)} 
          size="lg"
          variant="default"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Category
          <kbd className="hidden sm:inline-flex ml-2 px-2 py-1 text-xs font-semibold text-white/90 bg-black/10 rounded border-none">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Categories List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">
                {searchTerm ? 'No categories found' : 'No categories yet'}
              </p>
              <p className="text-sm">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first category to organize products'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsModalOpen(true)} 
                  variant="default"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIcon('name')}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Description
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-center"
                      onClick={() => handleSort('product_count')}
                    >
                      Products {getSortIcon('product_count')}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-center">
                      Color
                    </TableHead>
                    <TableHead 
                      className="hidden lg:table-cell cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('created_at')}
                    >
                      Created {getSortIcon('created_at')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {category.icon && (
                            <span className="text-muted-foreground">{category.icon}</span>
                          )}
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {category.description || '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={category.product_count > 0 ? "default" : "secondary"}>
                          {category.product_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        {category.color ? (
                          <div className="flex items-center justify-center gap-2">
                            <div 
                              className="w-6 h-6 rounded border border-border"
                              style={{ backgroundColor: category.color }}
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {category.created_at 
                          ? new Date(category.created_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Modal */}
      <ProductCategoryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, category: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation.category?.product_count > 0 ? (
                <>
                  Cannot delete category "<strong>{deleteConfirmation.category?.name}</strong>" 
                  because it contains <strong>{deleteConfirmation.category?.product_count}</strong> product
                  {deleteConfirmation.category?.product_count > 1 ? 's' : ''}.
                  <br /><br />
                  Please reassign or delete these products first.
                </>
              ) : (
                <>
                  Are you sure you want to delete category "<strong>{deleteConfirmation.category?.name}</strong>"? 
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteConfirmation.category?.product_count === 0 && (
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductCategoryManagement;