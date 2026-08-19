import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Package, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ApplyHSNToCategoryModal = ({ isOpen, onClose, hsnId, hsnCode, hsnLabel, gstRate, onSuccess }) => {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [includeManualOverrides, setIncludeManualOverrides] = useState(false);
  
  const [affectedProducts, setAffectedProducts] = useState([]);
  const [manualOverrideProducts, setManualOverrideProducts] = useState([]);
  
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [categoriesError, setCategoriesError] = useState(null);

  const fetchCategories = async () => {
    console.log('[ApplyHSNToCategoryModal] Fetching categories for user:', user?.id);
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('seller_id', user.id)
        .order('name');

      if (error) {
        console.error('[ApplyHSNToCategoryModal] Error fetching categories:', error);
        throw error;
      }
      
      console.log('[ApplyHSNToCategoryModal] Fetched categories:', data);
      
      const categoriesWithCount = await Promise.all(
        (data || []).map(async (cat) => {
          const { count, error: countError } = await supabase
            .from('point_of_sale_products')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .or(`category_id.eq.${cat.id},category.eq.${cat.name}`);
          
          if (countError) {
            console.error(`[ApplyHSNToCategoryModal] Error counting products for category ${cat.name}:`, countError);
          }
          
          return {
            ...cat,
            product_count: count || 0
          };
        })
      );

      console.log('[ApplyHSNToCategoryModal] Categories with counts:', categoriesWithCount);
      setCategories(categoriesWithCount);
    } catch (err) {
      console.error('[ApplyHSNToCategoryModal] Fatal error in fetchCategories:', err);
      setCategoriesError('Failed to fetch categories. Please try again.');
      toast.error('Failed to fetch categories');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      console.log('[ApplyHSNToCategoryModal] Modal opened with HSN:', { hsnId, hsnCode, hsnLabel, gstRate });
      fetchCategories();
      setSelectedCategoryId('');
      setSelectedCategoryName('');
      setIncludeManualOverrides(false);
      setAffectedProducts([]);
      setManualOverrideProducts([]);
      setShowConfirmation(false);
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedCategoryId || !selectedCategoryName) {
        setAffectedProducts([]);
        setManualOverrideProducts([]);
        return;
      }

      console.log('[ApplyHSNToCategoryModal] Fetching products for category:', { 
        selectedCategoryId, 
        selectedCategoryName, 
        includeManualOverrides 
      });

      setIsLoadingProducts(true);
      try {
        let productsQuery = supabase
          .from('point_of_sale_products')
          .select(`
            id,
            name,
            sku,
            category,
            category_id,
            hsn_id,
            manual_hsn_override,
            hsn_master:hsn_id (
              id,
              hsn_code,
              label,
              gst_percentage
            )
          `)
          .eq('user_id', user.id)
          .eq('archived', false)
          .or(`category_id.eq.${selectedCategoryId},category.eq.${selectedCategoryName}`);

        if (!includeManualOverrides) {
          productsQuery = productsQuery.or('manual_hsn_override.is.null,manual_hsn_override.eq.false');
        }

        const { data: products, error } = await productsQuery;
        
        if (error) {
          console.error('[ApplyHSNToCategoryModal] Error fetching products:', error);
          throw error;
        }

        console.log('[ApplyHSNToCategoryModal] Fetched products:', products);
        setAffectedProducts(products || []);

        const { data: overrides, error: overridesError } = await supabase
          .from('point_of_sale_products')
          .select('id, name, sku, manual_hsn_override')
          .eq('user_id', user.id)
          .eq('archived', false)
          .or(`category_id.eq.${selectedCategoryId},category.eq.${selectedCategoryName}`)
          .eq('manual_hsn_override', true);

        if (overridesError) {
          console.error('[ApplyHSNToCategoryModal] Error fetching overrides:', overridesError);
          throw overridesError;
        }
        
        console.log('[ApplyHSNToCategoryModal] Manual override products:', overrides);
        setManualOverrideProducts(overrides || []);
      } catch (err) {
        console.error('[ApplyHSNToCategoryModal] Fatal error fetching products:', err);
        toast.error('Failed to fetch products');
        setAffectedProducts([]);
        setManualOverrideProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedCategoryId, selectedCategoryName, includeManualOverrides, user?.id]);

  const handleCategoryChange = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    console.log('[ApplyHSNToCategoryModal] Category selected:', { categoryId, category });
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(category?.name || '');
  };

  const handleApplyClick = () => {
    console.log('[ApplyHSNToCategoryModal] Apply HSN clicked', {
      selectedCategoryId,
      selectedCategoryName,
      affectedProductsCount: affectedProducts.length,
      includeManualOverrides,
      hsnId,
      hsnCode
    });

    // Validation
    if (!hsnId) {
      console.error('[ApplyHSNToCategoryModal] No HSN selected');
      toast.error('Please select an HSN code');
      return;
    }

    if (!selectedCategoryId) {
      console.error('[ApplyHSNToCategoryModal] No category selected');
      toast.error('Please select a category');
      return;
    }

    if (affectedProducts.length === 0) {
      console.warn('[ApplyHSNToCategoryModal] No products to update');
      toast.warning('This category has no products to update');
      return;
    }

    console.log('[ApplyHSNToCategoryModal] Validation passed, showing confirmation dialog');
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    console.log('[ApplyHSNToCategoryModal] ===== STARTING HSN UPDATE =====');
    console.log('[ApplyHSNToCategoryModal] Update parameters:', {
      hsnId,
      hsnCode,
      hsnLabel,
      selectedCategoryId,
      selectedCategoryName,
      userId: user.id,
      includeManualOverrides,
      affectedProductsCount: affectedProducts.length
    });

    setIsUpdating(true);
    
    try {
      // Call the RPC function
      console.log('[ApplyHSNToCategoryModal] Calling apply_hsn_to_category RPC...');
      const { data, error } = await supabase.rpc('apply_hsn_to_category', {
        p_hsn_id: hsnId,
        p_category_id: selectedCategoryId,
        p_user_id: user.id,
        p_include_manual_overrides: includeManualOverrides
      });

      if (error) {
        console.error('[ApplyHSNToCategoryModal] RPC error:', error);
        throw error;
      }

      const updatedCount = data || 0;
      console.log('[ApplyHSNToCategoryModal] ✓ Successfully updated products:', updatedCount);

      // Show success message
      toast.success(
        `Successfully updated ${updatedCount} product${updatedCount !== 1 ? 's' : ''} in "${selectedCategoryName}" with HSN ${hsnCode} - ${hsnLabel}`,
        {
          duration: 5000,
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />
        }
      );

      // Call success callback if provided
      if (onSuccess) {
        console.log('[ApplyHSNToCategoryModal] Calling onSuccess callback');
        onSuccess();
      }

      // Close modal
      console.log('[ApplyHSNToCategoryModal] Closing modal');
      setShowConfirmation(false);
      onClose();

    } catch (err) {
      console.error('[ApplyHSNToCategoryModal] ===== UPDATE FAILED =====');
      console.error('[ApplyHSNToCategoryModal] Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        fullError: err
      });

      // Show detailed error message
      const errorMessage = err.message || 'Failed to apply HSN to category';
      toast.error(`Update failed: ${errorMessage}`, {
        duration: 7000,
        description: err.hint || 'Please try again or contact support if the issue persists'
      });

    } finally {
      setIsUpdating(false);
      console.log('[ApplyHSNToCategoryModal] ===== UPDATE PROCESS COMPLETE =====');
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showConfirmation} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-xl">Apply HSN to Category</DialogTitle>
              <DialogDescription>
                Apply this HSN code to all products within a specific category.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Selected HSN</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-background px-2 py-1 rounded border text-sm font-medium">
                        {hsnCode || 'N/A'}
                      </span>
                      <span className="font-medium">{hsnLabel}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {gstRate}% GST
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select Category <span className="text-red-500">*</span></Label>
                {isLoadingCategories ? (
                  <Skeleton className="h-10 w-full" />
                ) : categoriesError ? (
                  <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm flex-1">{categoriesError}</span>
                    <Button variant="outline" size="sm" onClick={fetchCategories}>Retry</Button>
                  </div>
                ) : (
                  <Select value={selectedCategoryId || undefined} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a category..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[500px]">
                      {categories.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No categories available
                        </div>
                      ) : (
                        <ScrollArea className="h-full max-h-[500px] w-full custom-scrollbar">
                          <div className="py-1 px-1">
                            {categories
                              .filter(cat => cat && cat.id && String(cat.id).trim() !== '')
                              .map(cat => (
                              <SelectItem 
                                key={cat.id} 
                                value={cat.id}
                                className="cursor-pointer"
                              >
                                {cat.name || 'Unnamed Category'} <span className="text-muted-foreground">({cat.product_count || 0} products)</span>
                              </SelectItem>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedCategoryId && (
                <div className="space-y-4 pt-2">
                  <Label className="text-sm font-semibold">Update Options</Label>
                  <RadioGroup 
                    value={includeManualOverrides ? "all" : "no-override"} 
                    onValueChange={(val) => setIncludeManualOverrides(val === "all")}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-2 border p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <RadioGroupItem value="no-override" id="no-override" className="mt-1" />
                      <Label htmlFor="no-override" className="cursor-pointer flex-1 leading-snug">
                        <span className="block font-medium">Update only products without manual override</span>
                        <span className="block text-xs text-muted-foreground mt-1">Preserves individual product HSN settings that were manually set.</span>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-2 border p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <RadioGroupItem value="all" id="all" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="all" className="cursor-pointer leading-snug">
                          <span className="block font-medium">Update all products (including manual overrides)</span>
                          <span className="block text-xs text-muted-foreground mt-1">Force applies this HSN to every product in the category.</span>
                        </Label>
                        
                        {includeManualOverrides && manualOverrideProducts.length > 0 && (
                          <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-2.5 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium">
                              {manualOverrideProducts.length} product(s) have manual HSN overrides. These will be overwritten.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {selectedCategoryId && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Preview</Label>
                    {!isLoadingProducts && (
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                        {affectedProducts.length} product(s) will be updated
                      </Badge>
                    )}
                  </div>
                  
                  <div className="border rounded-md overflow-hidden bg-card">
                    {isLoadingProducts ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : affectedProducts.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium">No products found to update</p>
                        {manualOverrideProducts.length > 0 && !includeManualOverrides && (
                          <p className="text-xs mt-1">All products in this category have manual overrides.</p>
                        )}
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px]">
                        <div className="p-2 space-y-1">
                          {affectedProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors text-sm">
                              <div className="flex flex-col min-w-0 mr-4">
                                <span className="font-medium truncate">{product.name}</span>
                                {product.sku && <span className="text-xs text-muted-foreground truncate">SKU: {product.sku}</span>}
                              </div>
                              <div className="shrink-0 text-right">
                                {product.hsn_master ? (
                                  <Badge variant="outline" className={`text-[10px] ${product.manual_hsn_override ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' : ''}`}>
                                    {product.hsn_master.hsn_code}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No HSN</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t bg-background mt-auto">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleApplyClick}
                disabled={!selectedCategoryId || affectedProducts.length === 0 || isLoadingProducts || isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply HSN'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update <span className="font-bold text-foreground">{affectedProducts.length}</span> product(s) in <span className="font-bold text-foreground">{selectedCategoryName}</span> with HSN <span className="font-bold text-foreground">{hsnCode}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4">
            <ScrollArea className="h-[200px] border rounded-md bg-muted/30 p-2">
              {affectedProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center py-1.5 px-2 border-b last:border-0 text-sm">
                  <span className="truncate pr-2 font-medium">{p.name}</span>
                  {p.manual_hsn_override && (
                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                      Override
                    </Badge>
                  )}
                </div>
              ))}
            </ScrollArea>

            {includeManualOverrides && manualOverrideProducts.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md text-red-800 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  <strong>Warning:</strong> {manualOverrideProducts.length} product(s) have manual HSN overrides that will be permanently overwritten by this action.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { 
                e.preventDefault(); 
                console.log('[ApplyHSNToCategoryModal] Confirmation button clicked');
                handleConfirmUpdate(); 
              }}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating {affectedProducts.length} products...
                </>
              ) : (
                <>Confirm Update ({affectedProducts.length} products)</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ApplyHSNToCategoryModal;