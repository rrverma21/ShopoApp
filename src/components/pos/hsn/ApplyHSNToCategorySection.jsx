import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Check, Info } from 'lucide-react';

const ApplyHSNToCategorySection = ({ onSuccess }) => {
  const { user } = useAuth();
  const { hsnCodes, applyHSNToCategory } = useHSNMaster();
  const [categories, setCategories] = useState([]);
  const [selectedHSN, setSelectedHSN] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productsToUpdate, setProductsToUpdate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.id) return;

      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, default_hsn_id')
          .eq('seller_id', user.id)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [user?.id]);

  useEffect(() => {
    const calculateProductsToUpdate = async () => {
      if (!selectedCategory || !user?.id) {
        setProductsToUpdate(0);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('point_of_sale_products')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', selectedCategory)
          .eq('user_id', user.id)
          .or('manual_hsn_override.is.null,manual_hsn_override.eq.false');

        if (error) throw error;
        setProductsToUpdate(count || 0);
      } catch (error) {
        console.error('Error calculating products:', error);
        setProductsToUpdate(0);
      }
    };

    calculateProductsToUpdate();
  }, [selectedCategory, user?.id]);

  const handleApply = async () => {
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      // CRITICAL FIX: Pass parameters in correct order - hsnId first, then categoryId
      const result = await applyHSNToCategory(selectedHSN, selectedCategory, false);
      
      if (result.success) {
        setSelectedHSN('');
        setSelectedCategory('');
        setProductsToUpdate(0);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error applying HSN:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedHSNData = hsnCodes.find(h => h.id === selectedHSN);
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const canApply = selectedHSN && selectedCategory && productsToUpdate >= 0;

  return (
    <>
      <Card className="hsn-bulk-update-card">
        <CardHeader>
          <CardTitle>Bulk Apply HSN to Category</CardTitle>
          <CardDescription>
            Apply an HSN code to all products in a category (excluding products with manual overrides)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bulk-hsn-select">Select HSN</Label>
            <Select 
              value={selectedHSN} 
              onValueChange={setSelectedHSN}
              disabled={loading}
            >
              <SelectTrigger id="bulk-hsn-select">
                <SelectValue placeholder="Choose HSN to apply" />
              </SelectTrigger>
              <SelectContent>
                {hsnCodes.map((hsn) => (
                  <SelectItem key={hsn.id} value={hsn.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{hsn.label}</span>
                      {hsn.hsn_code && <span className="font-mono text-muted-foreground">({hsn.hsn_code})</span>}
                      <Badge variant="secondary" className="ml-2">
                        {hsn.gst_percentage || 0}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-category-select">Select Category</Label>
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
              disabled={loading || loadingCategories}
            >
              <SelectTrigger id="bulk-category-select">
                <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Choose category"} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedHSN && selectedCategory && (
            <div className="hsn-preview-section p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Update Preview</p>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">HSN:</span>
                      <span className="font-medium">{selectedHSNData?.label}</span>
                      {selectedHSNData?.hsn_code && (
                        <Badge variant="outline" className="font-mono">
                          {selectedHSNData?.hsn_code}
                        </Badge>
                      )}
                      <Badge variant="secondary">{selectedHSNData?.gst_percentage || 0}%</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{selectedCategoryData?.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Products to update:</span>
                      <Badge variant="default">{productsToUpdate}</Badge>
                    </div>
                  </div>

                  {productsToUpdate === 0 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      No products will be updated. All products in this category may have manual overrides.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={!canApply || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply HSN to All Products in Category
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            This will update the category's default HSN and apply it to all products without manual overrides.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk HSN Update</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to apply this HSN code to the category?</p>
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-2 text-sm">
                <div><strong>HSN Name:</strong> {selectedHSNData?.label}</div>
                {selectedHSNData?.hsn_code && <div><strong>HSN Code:</strong> {selectedHSNData?.hsn_code}</div>}
                <div><strong>GST Rate:</strong> {selectedHSNData?.gst_percentage || 0}%</div>
                <div><strong>Category:</strong> {selectedCategoryData?.name}</div>
                <div><strong>Products to update:</strong> {productsToUpdate}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Products with manual HSN overrides will not be affected.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ApplyHSNToCategorySection;