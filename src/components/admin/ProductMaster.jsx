import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Search, Zap, Eye, Pencil, Image as ImageIcon, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, toCamelCase } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MultiImageUploader from './MultiImageUploader';
import QuickAddProductModal from './QuickAddProductModal';

const ProductMaster = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals & State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Filter Data
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('product_master').select('*', { count: 'exact' });

      if (searchQuery) {
        query = query.or(`product_name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }
      
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      // Optimized: Fetch count and data in a single request
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      
      setTotalCount(count || 0);
      setProducts(data || []);

      // Fetch categories for filter if not already loaded
      if (categories.length === 0) {
        const { data: allCats } = await supabase.from('product_master').select('category');
        if (allCats) {
          const uniqueCats = [...new Set(allCats.map(p => p.category).filter(Boolean))].sort();
          setCategories(uniqueCats);
        }
      }

    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, page, categories.length]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleteProduct) return;
    try {
      const { error } = await supabase.from('product_master').delete().eq('id', deleteProduct.id);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Product deleted successfully' });
      fetchProducts();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' });
    } finally {
      setDeleteProduct(null);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
             Product Master
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total Products: <span className="font-semibold text-blue-600">{totalCount}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button 
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 rounded-full md:rounded-lg"
              onClick={() => setIsQuickAddOpen(true)}
            >
              <Zap className="mr-2 h-4 w-4 fill-current" /> Quick Add
            </Button>
            <Button 
              className="flex-1 md:flex-none bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              variant="outline"
              onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, barcode, or category..."
                className="pl-10 h-11 bg-white dark:bg-slate-950 rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Select value={filterCategory} onValueChange={(val) => { setFilterCategory(val); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-[180px] h-11 rounded-lg bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card className="border-none shadow-lg overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50 hidden md:table-header-group">
                <TableRow>
                  <TableHead className="w-[80px] font-semibold text-slate-700">Image</TableHead>
                  <TableHead className="font-semibold text-slate-700">Product Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Barcode</TableHead>
                  <TableHead className="font-semibold text-slate-700">Category</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">MRP</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 w-[140px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span>Loading products...</span>
                        </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                        No products found. Try adjusting your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow 
                        key={product.id} 
                        className="group flex flex-col md:table-row border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Mobile: Image Row */}
                      <TableCell className="md:w-[80px] p-4 md:p-4 flex md:table-cell justify-between items-center border-b md:border-none md:align-middle">
                        <div className="flex items-center gap-4 md:hidden">
                            <span className="font-medium text-slate-500">Image</span>
                        </div>
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.product_name || product.name} 
                            className="h-[60px] w-[60px] object-cover rounded-lg border bg-white shadow-sm"
                          />
                        ) : (
                          <div className="h-[60px] w-[60px] bg-slate-100 dark:bg-slate-800 rounded-lg border flex items-center justify-center text-slate-300">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </TableCell>

                      {/* Product Name */}
                      <TableCell className="p-3 md:p-4 flex md:table-cell justify-between items-center md:align-middle">
                        <span className="md:hidden font-medium text-slate-500">Name</span>
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-base md:text-sm">
                            {toCamelCase(product.product_name || product.name)}
                        </div>
                      </TableCell>

                      {/* Barcode */}
                      <TableCell className="p-3 md:p-4 flex md:table-cell justify-between items-center md:align-middle">
                        <span className="md:hidden font-medium text-slate-500">Barcode</span>
                        <div className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs inline-block">
                            {product.barcode || product.sku || '-'}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="p-3 md:p-4 flex md:table-cell justify-between items-center md:align-middle">
                        <span className="md:hidden font-medium text-slate-500">Category</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {product.category || 'Uncategorized'}
                        </span>
                      </TableCell>

                      {/* MRP */}
                      <TableCell className="p-3 md:p-4 flex md:table-cell justify-between items-center md:align-middle text-right">
                        <span className="md:hidden font-medium text-slate-500">MRP</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {product.mrp ? formatPrice(product.mrp) : '-'}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="p-4 md:p-4 flex md:table-cell justify-end items-center md:align-middle gap-2 border-t md:border-none">
                        <div className="flex gap-2 w-full md:w-auto justify-end">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                                title="View Details"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                onClick={() => handleEdit(product)}
                                title="Edit Product"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                onClick={() => setDeleteProduct(product)}
                                title="Delete Product"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="h-9"
            >
                Previous
            </Button>
            <span className="text-sm text-slate-500">
                Page {page} of {Math.ceil(totalCount / ITEMS_PER_PAGE) || 1}
            </span>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)} 
                disabled={page * ITEMS_PER_PAGE >= totalCount}
                className="h-9"
            >
                Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
      <ProductMasterForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingProduct}
        onSuccess={() => {
          setIsFormOpen(false);
          fetchProducts();
        }}
      />

      {/* Quick Add Modal */}
      <QuickAddProductModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={fetchProducts}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteProduct?.product_name || deleteProduct?.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-red-600 hover:bg-red-700 rounded-lg"
            >
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ProductMasterForm = ({ open, onOpenChange, initialData, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        product_name: initialData?.product_name || initialData?.name || '',
        barcode: initialData?.barcode || initialData?.sku || '',
        category: initialData?.category || '',
        mrp: initialData?.mrp || '',
        notes: initialData?.notes || '',
        stock: '', 
        images: initialData?.image_url ? [initialData.image_url] : []
      });
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    
    setSaving(true);
    try {
      // Check for duplicate barcode
      if (formData.barcode) {
        // Use maybeSingle() to avoid PGRST116 error on no rows
        const { data: existingProduct, error: checkError } = await supabase
            .from('product_master')
            .select('id')
            .eq('barcode', formData.barcode)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingProduct && existingProduct.id !== initialData?.id) {
            throw new Error(`Barcode '${formData.barcode}' is already used by another product.`);
        }
      }

      const payload = {
        product_name: formData.product_name,
        barcode: formData.barcode,
        category: formData.category,
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        notes: formData.notes,
        image_url: formData.images?.[0] || null,
      };

      if (initialData?.id) {
        const { error } = await supabase.from('product_master').update(payload).eq('id', initialData.id);
        if (error) throw error;
        toast({ title: "Updated", description: "Product updated successfully." });
      } else {
        const { error } = await supabase.from('product_master').insert(payload);
        if (error) throw error;
        toast({ title: "Created", description: "Product created successfully." });
      }
      onSuccess();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            Update product details in the master catalog.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="border rounded-xl p-4 bg-slate-50">
                    <MultiImageUploader 
                        initialImages={formData.images}
                        onImagesChange={({ urls, isUploading }) => {
                            setUploading(isUploading);
                            setFormData(prev => ({ ...prev, images: urls }));
                        }}
                        folderPrefix="master"
                        maxImages={1}
                    />
                </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="product_name">Product Name <span className="text-red-500">*</span></Label>
                    <Input 
                        id="product_name" name="product_name" 
                        value={formData.product_name || ''} 
                        onChange={handleChange} 
                        onBlur={(e) => setFormData(prev => ({ ...prev, product_name: toCamelCase(e.target.value) }))}
                        required 
                        className="rounded-lg h-11"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode <span className="text-red-500">*</span></Label>
                    <Input 
                        id="barcode" name="barcode" 
                        value={formData.barcode || ''} 
                        onChange={handleChange} 
                        required 
                        className="rounded-lg h-11 font-mono"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                    <Input 
                        id="category" name="category" 
                        value={formData.category || ''} 
                        onChange={handleChange} 
                        required 
                        className="rounded-lg h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mrp">MRP (₹) <span className="text-red-500">*</span></Label>
                    <Input 
                        id="mrp" name="mrp" type="number" step="0.01" 
                        value={formData.mrp || ''} 
                        onChange={handleChange} 
                        required 
                        className="rounded-lg h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stock">Opening Stock (Optional)</Label>
                    <Input 
                        id="stock" name="stock" type="number" 
                        value={formData.stock || ''} 
                        onChange={handleChange} 
                        placeholder="0"
                        className="rounded-lg h-11"
                    />
                    <p className="text-[10px] text-muted-foreground">Note: Stock is for initial record only.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Description</Label>
                    <Textarea 
                        id="notes" name="notes" 
                        value={formData.notes || ''} 
                        onChange={handleChange} 
                        className="rounded-lg min-h-[100px]"
                        placeholder="Product details, features, etc."
                    />
                </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg h-11 flex-1 md:flex-none">
                Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading} className="bg-blue-600 hover:bg-blue-700 rounded-lg h-11 flex-1 md:flex-none">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductMaster;