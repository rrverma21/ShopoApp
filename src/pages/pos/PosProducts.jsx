import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, Search, Edit, Trash2, Package, 
  ChevronDown, ChevronUp, ArrowUpDown, FolderOpen
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ProductHSNSection from '@/components/pos/product/ProductHSNSection';
import ProductHSNFilter from '@/components/pos/product/ProductHSNFilter';
import ProductCategoryManagement from '@/components/pos/category/ProductCategoryManagement';
import CategoryDropdown from '@/components/pos/CategoryDropdown';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import UpgradeCard from '@/components/pos/UpgradeCard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatPrice } from '@/lib/utils';

const PosProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  
  // Filter states
  const [hsnFilter, setHsnFilter] = useState({ hsnId: null, gstRate: null, manualOverride: false });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const { isLimitReached, maxProducts, currentProducts, isLoading: limitsLoading } = usePlanLimits();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    cost_price: '',
    selling_price: '',
    tax_rate: 0,
    stock_level: 0,
    hsn_id: null,
    manual_hsn_override: false
  });

  const fetchProducts = useCallback(async (abortSignal) => {
    if (!user) return;
    
    // Only set loading if we don't have products yet to avoid disruptive flashing
    if (products.length === 0) setLoading(true);
    
    try {
      let query = supabase
        .from('point_of_sale_products')
        .select(`
          id,
          name,
          sku,
          cost_price,
          selling_price,
          tax_rate,
          stock_level,
          category_id,
          hsn_id,
          manual_hsn_override,
          archived,
          categories:category_id (
            id,
            name
          ),
          hsn_master:hsn_id (
            id,
            hsn_code,
            gst_percentage,
            label,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('name');

      // Attach abort signal if provided (prevents state updates on unmounted components)
      if (abortSignal && typeof query.abortSignal === 'function') {
        query = query.abortSignal(abortSignal);
      }

      const { data, error } = await query;

      // Double check abort status after async resolution
      if (abortSignal?.aborted) return;

      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      // Gracefully handle AbortError without showing toasts
      if (error.name === 'AbortError' || error.message?.toLowerCase().includes('aborted')) {
        console.log('Products fetch request gracefully aborted (component unmounted).');
        return;
      }
      
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      // Always ensure loading spinner turns off unless the component is actively unmounting
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  }, [user, products.length]);

  useEffect(() => {
    // Create new controller for this effect execution
    const abortController = new AbortController();
    
    fetchProducts(abortController.signal);
    
    return () => { 
      // Abort any ongoing fetch request when component unmounts or user changes
      abortController.abort(); 
    };
  }, [fetchProducts]);

  // Real-time subscription for products
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('pos-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'point_of_sale_products',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Trigger fetch silently in background without abort signal
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProducts]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(search) ||
        product.sku?.toLowerCase().includes(search) ||
        product.categories?.name?.toLowerCase().includes(search) ||
        product.hsn_master?.hsn_code?.toLowerCase().includes(search)
      );
    }

    // HSN filter
    if (hsnFilter.hsnId) {
      if (hsnFilter.hsnId === 'no-hsn') {
        filtered = filtered.filter(p => !p.hsn_master);
      } else {
        filtered = filtered.filter(p => p.hsn_master?.id === hsnFilter.hsnId);
      }
    }

    // GST rate filter
    if (hsnFilter.gstRate !== null) {
      filtered = filtered.filter(p => p.hsn_master?.gst_percentage === hsnFilter.gstRate);
    }

    // Manual override filter
    if (hsnFilter.manualOverride) {
      filtered = filtered.filter(p => p.manual_hsn_override === true);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.key) {
        case 'hsn_code':
          aVal = a.hsn_master?.hsn_code || '';
          bVal = b.hsn_master?.hsn_code || '';
          break;
        case 'gst_rate':
          aVal = a.hsn_master?.gst_percentage || 0;
          bVal = b.hsn_master?.gst_percentage || 0;
          break;
        case 'category':
          aVal = a.categories?.name || '';
          bVal = b.categories?.name || '';
          break;
        default:
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, hsnFilter, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1 inline" />
      : <ChevronDown className="h-4 w-4 ml-1 inline" />;
  };

  const getGSTBadgeColor = (rate) => {
    if (rate <= 5) return 'bg-green-100 text-green-700 border-green-200';
    if (rate <= 12) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (rate <= 18) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const handleSaveProduct = async () => {
    try {
      if (!editingProduct && isLimitReached) {
        toast.error("Product limit reached. Please upgrade your plan to add more products.");
        return;
      }

      if (!user) throw new Error('Not authenticated');

      const productData = {
        user_id: user.id,
        name: formData.name,
        sku: formData.sku || null,
        category_id: formData.category_id || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        stock_level: parseInt(formData.stock_level) || 0,
        hsn_id: formData.hsn_id || null,
        manual_hsn_override: formData.manual_hsn_override || false,
        archived: false
      };

      let error;
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('point_of_sale_products')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('point_of_sale_products')
          .insert([productData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('point_of_sale_products')
        .update({ archived: true })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      category_id: product.category_id || '',
      cost_price: product.cost_price || '',
      selling_price: product.selling_price || '',
      tax_rate: product.tax_rate || 0,
      stock_level: product.stock_level || 0,
      hsn_id: product.hsn_id || null,
      manual_hsn_override: product.manual_hsn_override || false
    });
    setIsDialogOpen(true);
  };

  const resetForm = useCallback(() => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category_id: '',
      cost_price: '',
      selling_price: '',
      tax_rate: 0,
      stock_level: 0,
      hsn_id: null,
      manual_hsn_override: false
    });
  }, []);

  const handleDialogClose = useCallback((open) => {
    if (!open) {
      resetForm();
    }
    setIsDialogOpen(open);
  }, [resetForm]);
  
  const handleCategoryChange = useCallback((value) => {
    setFormData(prev => {
      if (prev.category_id === value) return prev;
      return { ...prev, category_id: value };
    });
  }, []);

  if (loading && products.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-64 lg:col-span-1" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Product Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your products and categories
          </p>
        </div>
      </div>

      {!limitsLoading && isLimitReached && (
        <UpgradeCard currentProducts={currentProducts} maxProducts={maxProducts} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products ({filteredProducts.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Manage your product inventory ({filteredProducts.length} products)
            </p>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                      <DialogTrigger asChild>
                        <Button size="lg" disabled={isLimitReached}>
                          <Plus className="h-5 w-5 mr-2" />
                          Add Product
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingProduct ? 'Edit Product' : 'Create New Product'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          {/* Basic Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Product Name *</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter product name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sku">SKU</Label>
                              <Input
                                id="sku"
                                value={formData.sku}
                                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                                placeholder="Auto-generated if empty"
                              />
                            </div>
                          </div>

                          {/* Category */}
                          <CategoryDropdown 
                            value={formData.category_id} 
                            onValueChange={handleCategoryChange} 
                            placeholder="Select category"
                          />

                          {/* HSN Configuration */}
                          <ProductHSNSection
                            productData={formData}
                            categoryId={formData.category_id}
                            onHSNChange={(hsnData) => setFormData(prev => ({ ...prev, ...hsnData }))}
                          />

                          {/* Pricing */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cost_price">Cost Price</Label>
                              <Input
                                id="cost_price"
                                type="number"
                                step="0.01"
                                value={formData.cost_price}
                                onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="selling_price">Selling Price *</Label>
                              <Input
                                id="selling_price"
                                type="number"
                                step="0.01"
                                value={formData.selling_price}
                                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="stock_level">Stock Level</Label>
                              <Input
                                id="stock_level"
                                type="number"
                                value={formData.stock_level}
                                onChange={(e) => setFormData(prev => ({ ...prev, stock_level: e.target.value }))}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => handleDialogClose(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSaveProduct} disabled={!formData.name || !formData.selling_price || (!editingProduct && isLimitReached)}>
                              {editingProduct ? 'Update Product' : 'Create Product'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TooltipTrigger>
                {isLimitReached && (
                  <TooltipContent>
                    <p>Product limit reached. Please upgrade your plan.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <ProductHSNFilter
                products={products}
                onFilterChange={setHsnFilter}
              />
            </div>

            {/* Products Table */}
            <div className="lg:col-span-3 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, category, or HSN code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Products List ({filteredProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">No products found</p>
                      <p className="text-sm">Try adjusting your filters or create a new product</p>
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
                              Product Name {getSortIcon('name')}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSort('category')}
                            >
                              Category {getSortIcon('category')}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSort('hsn_code')}
                            >
                              HSN Code {getSortIcon('hsn_code')}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSort('gst_rate')}
                            >
                              GST % {getSortIcon('gst_rate')}
                            </TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                {product.categories?.name ? (
                                  <Badge variant="secondary">{product.categories.name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No category</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {product.hsn_master ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          variant={product.manual_hsn_override ? "default" : "secondary"}
                                          className={`font-mono ${product.manual_hsn_override ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                                        >
                                          {product.hsn_master.hsn_code}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <div className="space-y-1">
                                          <p className="font-semibold">{product.hsn_master.label}</p>
                                          <p className="text-xs">Code: {product.hsn_master.hsn_code}</p>
                                          <p className="text-xs">GST: {product.hsn_master.gst_percentage}%</p>
                                          {product.manual_hsn_override && (
                                            <p className="text-xs text-amber-600">Manual Override</p>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No HSN</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {product.hsn_master ? (
                                  <Badge className={getGSTBadgeColor(product.hsn_master.gst_percentage)}>
                                    {product.hsn_master.gst_percentage}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {formatPrice(product.selling_price)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={product.stock_level > 0 ? "default" : "destructive"}>
                                  {product.stock_level}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <ProductCategoryManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PosProducts;